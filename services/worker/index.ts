import http from 'http';
import path from 'path';
import fs from 'fs';
import { createAdminClient } from '../../lib/supabase/admin';
import { claimNextQueuedJob, calculateBackoffDelayMs } from '../../lib/pdf/queue';
import { processMagazinePdf } from '../../lib/pdf/pipeline';
import { PIPELINE_CONFIG, QUEUE_CONFIG } from '../../lib/config/upload-limits';
import { cleanupStaleWorkspace, releaseSourcePdf } from '../../lib/pdf/workspace';

// Environment & Configuration
const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 6) : Date.now().toString().slice(-6)}`;
const HEALTH_PORT = parseInt(process.env.PORT || process.env.HEALTH_PORT || '3001', 10);
const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS || '3000', 10);
const BATCH_SIZE = parseInt(process.env.WORKER_BATCH_SIZE || String(PIPELINE_CONFIG.CONTAINER_BATCH_SIZE), 10);

interface WorkerState {
  workerId: string;
  status: 'STARTING' | 'IDLE' | 'PROCESSING' | 'SHUTTING_DOWN';
  activeJobId: string | null;
  activeMagazineId: string | null;
  jobsProcessedCount: number;
  pagesProcessedCount: number;
  uptimeSeconds: number;
  lastHeartbeatAt: string;
  memoryRssMb: number;
}

const state: WorkerState = {
  workerId: WORKER_ID,
  status: 'STARTING',
  activeJobId: null,
  activeMagazineId: null,
  jobsProcessedCount: 0,
  pagesProcessedCount: 0,
  uptimeSeconds: 0,
  lastHeartbeatAt: new Date().toISOString(),
  memoryRssMb: 0,
};

let isShuttingDown = false;
const startTime = Date.now();

/**
 * Lightweight Healthcheck & Metrics Server
 */
const healthServer = http.createServer((req, res) => {
  const url = req.url?.split('?')[0];

  if (url === '/healthz' || url === '/readyz') {
    const isHealthy = !isShuttingDown;
    res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: isHealthy ? 'OK' : 'SHUTTING_DOWN', workerId: WORKER_ID }));
    return;
  }

  if (url === '/status' || url === '/metrics') {
    state.uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    state.memoryRssMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state, null, 2));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

/**
 * Asynchronous sleep helper
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Main autonomous worker loop
 */
async function startWorkerLoop() {
  console.log('================================================================');
  console.log('       THE RKIVE — DEDICATED PDF PROCESSING WORKER DAEMON        ');
  console.log('================================================================');
  console.log(`Worker ID:          ${WORKER_ID}`);
  console.log(`Node Runtime:       ${process.version} (PID: ${process.pid})`);
  console.log(`Batch Size:         ${BATCH_SIZE} pages/batch`);
  console.log(`Poll Interval:      ${POLL_INTERVAL_MS}ms`);
  console.log(`Healthcheck Server: http://0.0.0.0:${HEALTH_PORT}/healthz`);
  console.log('----------------------------------------------------------------\n');

  healthServer.listen(HEALTH_PORT, '0.0.0.0', () => {
    console.log(`[WORKER_HTTP] Healthcheck listening on port ${HEALTH_PORT}`);
  });

  state.status = 'IDLE';

  // Periodic workspace housekeeping (every 6 hours)
  const housekeepingInterval = setInterval(() => {
    const cleaned = cleanupStaleWorkspace();
    if (cleaned > 0) {
      console.log(`[WORKER_HOUSEKEEPING] Purged ${cleaned} stale files from workspace`);
    }
  }, 6 * 60 * 60 * 1000);
  housekeepingInterval.unref();

  while (!isShuttingDown) {
    try {
      state.status = 'IDLE';
      state.activeJobId = null;
      state.activeMagazineId = null;

      // 1. Atomically claim next available job in PostgreSQL
      const job = await claimNextQueuedJob(WORKER_ID, Math.floor(QUEUE_CONFIG.LEASE_TIMEOUT_MS / 1000));

      if (!job) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      state.status = 'PROCESSING';
      state.activeJobId = job.id;
      state.activeMagazineId = job.magazine_id;
      state.lastHeartbeatAt = new Date().toISOString();

      console.log(`\n[WORKER_JOB] START job_id=${job.id} publication_id=${job.magazine_id} attempt=${job.attempts}`);

      // 2. Loop through publication batches until 100% complete or error
      let publicationComplete = false;
      const jobStartTime = Date.now();

      while (!publicationComplete && !isShuttingDown) {
        const batchResult = await processMagazinePdf(job.magazine_id, {
          workerId: WORKER_ID,
          maxPagesPerRun: BATCH_SIZE,
          onPageProgress: (current, total) => {
            state.pagesProcessedCount++;
            state.lastHeartbeatAt = new Date().toISOString();
          },
        });

        if (!batchResult.success) {
          console.error(`[WORKER_JOB] BATCH_ERROR job_id=${job.id} error=${batchResult.error} type=${batchResult.errorType}`);

          const delayMs = calculateBackoffDelayMs(job.attempts || 1);
          const delaySec = Math.ceil(delayMs / 1000);
          const supabase = createAdminClient();

          try {
            await (supabase.rpc as any)('release_pdf_job', {
              p_job_id: job.id,
              p_worker_id: WORKER_ID,
              p_status: batchResult.errorType === 'PERMANENT' ? 'FAILED' : 'QUEUED',
              p_error: batchResult.error || 'Worker processing error',
              p_error_type: batchResult.errorType || 'TRANSIENT',
              p_is_terminal: batchResult.errorType === 'PERMANENT',
              p_retry_delay_seconds: batchResult.errorType === 'PERMANENT' ? 0 : delaySec,
            });
          } catch {
            await (supabase.from('pdf_processing_jobs') as any)
              .update({
                status: batchResult.errorType === 'PERMANENT' ? 'FAILED' : 'QUEUED',
                locked_at: null,
                locked_by: null,
                last_error: batchResult.error,
                error_type: batchResult.errorType,
                is_terminal: batchResult.errorType === 'PERMANENT',
                available_at: new Date(Date.now() + (batchResult.errorType === 'PERMANENT' ? 0 : delayMs)).toISOString(),
              })
              .eq('id', job.id);
          }

          if (batchResult.errorType === 'PERMANENT') {
            releaseSourcePdf(job.magazine_id);
          }

          break; // Exit inner loop to allow retry schedule
        }

        if (batchResult.completed) {
          publicationComplete = true;
          state.jobsProcessedCount++;
          const durationSec = ((Date.now() - jobStartTime) / 1000).toFixed(2);
          console.log(
            `[WORKER_JOB] SUCCESS job_id=${job.id} publication_id=${job.magazine_id} pages=${batchResult.pageCount} duration_sec=${durationSec}`
          );
        } else {
          // More pages remain — continue immediately to next batch using SAME cached source file!
          console.log(
            `[WORKER_JOB] CONTINUING_IN_PROCESS publication_id=${job.magazine_id} processed=${batchResult.processedPages}/${batchResult.pageCount} (${batchResult.progressPercent}%)`
          );
        }
      }
    } catch (err: any) {
      console.error('[WORKER_LOOP] Unexpected worker iteration error:', err);
      await sleep(5000);
    }
  }

  console.log('[WORKER_SHUTDOWN] Worker loop exited cleanly.');
}

/**
 * Graceful Shutdown Handlers (SIGTERM, SIGINT)
 */
async function handleGracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  state.status = 'SHUTTING_DOWN';
  console.log(`\n[WORKER_SHUTDOWN] Received ${signal}. Initiating graceful shutdown...`);

  // Stop accepting new health requests
  healthServer.close(() => {
    console.log('[WORKER_SHUTDOWN] Health server closed.');
  });

  // If a job is active, release lock back to QUEUED so other workers can resume
  if (state.activeJobId) {
    console.log(`[WORKER_SHUTDOWN] Releasing lock for active job ${state.activeJobId}...`);
    try {
      const supabase = createAdminClient();
      await (supabase.from('pdf_processing_jobs') as any)
        .update({
          status: 'QUEUED',
          locked_at: null,
          locked_by: null,
          available_at: new Date().toISOString(),
        })
        .eq('id', state.activeJobId);
      console.log('[WORKER_SHUTDOWN] Job lock released successfully.');
    } catch (releaseErr) {
      console.error('[WORKER_SHUTDOWN] Error releasing job lock:', releaseErr);
    }
  }

  console.log('[WORKER_SHUTDOWN] Shutdown complete. Goodbye.');
  process.exit(0);
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

// Start execution
startWorkerLoop().catch((fatalErr) => {
  console.error('[WORKER_FATAL] Fatal error in worker daemon:', fatalErr);
  process.exit(1);
});
