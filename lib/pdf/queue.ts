import { createAdminClient } from '@/lib/supabase/admin';
import { processMagazinePdf, ProcessMagazineResult } from './pipeline';
import { PdfProcessingJob } from '@/types/magazine';

export interface ProcessQueueResult {
  hasJob: boolean;
  jobId?: string;
  magazineId?: string;
  result?: ProcessMagazineResult;
  error?: string;
}

/**
 * Gets base URL for worker-to-worker internal triggers
 */
export function getInternalWorkerBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  return 'http://127.0.0.1:3000';
}

/**
 * Gets authorization secret for internal worker and Supabase pg_cron calls
 */
export function getInternalWorkerSecret(): string | null {
  return process.env.PDF_WORKER_SECRET || process.env.CRON_SECRET || null;
}

/**
 * Validates worker authorization header (Bearer token or dedicated x-worker-secret matching PDF_WORKER_SECRET)
 */
export function isValidWorkerSecret(authHeader: string | null, customHeader?: string | null): boolean {
  const primarySecret = process.env.PDF_WORKER_SECRET || process.env.CRON_SECRET;
  if (!primarySecret || primarySecret.trim().length === 0) {
    return false;
  }

  if (customHeader && customHeader === primarySecret) {
    return true;
  }

  if (!authHeader) return false;
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  return token === primarySecret;
}

/**
 * Atomically claims the next available queued job in PostgreSQL
 */
export async function claimNextQueuedJob(workerId: string): Promise<PdfProcessingJob | null> {
  const supabase = createAdminClient();

  try {
    // 1. Try atomic PostgreSQL RPC function if migration has run
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('claim_next_pdf_job', {
      p_worker_id: workerId,
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      return rpcData[0] as PdfProcessingJob;
    }
  } catch {
    // Fall back to direct atomic query
  }

  // 2. Direct atomic claim fallback
  try {
    const { data: candidate } = await (supabase
      .from('pdf_processing_jobs') as any)
      .select('id, attempts, max_attempts')
      .or('status.eq.QUEUED,and(status.eq.PROCESSING,locked_at.lt.' + new Date(Date.now() - 2 * 60 * 1000).toISOString() + ')')
      .lte('available_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!candidate || candidate.attempts >= candidate.max_attempts) {
      return null;
    }

    const { data: claimed, error: claimErr } = await (supabase
      .from('pdf_processing_jobs') as any)
      .update({
        status: 'PROCESSING',
        locked_at: new Date().toISOString(),
        locked_by: workerId,
        attempts: (candidate.attempts || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate.id)
      .select('*')
      .single();

    if (claimErr || !claimed) {
      return null;
    }

    return claimed as PdfProcessingJob;
  } catch (err) {
    console.error('[PDF_QUEUE] Error claiming next job from queue table, falling back to magazines table:', err);
  }

  // 3. Fallback: claim directly from magazines table if pdf_processing_jobs table not yet migrated
  try {
    const { data: mag } = await (supabase
      .from('magazines') as any)
      .select('id, processing_status')
      .or('processing_status.eq.QUEUED,processing_status.eq.NOT_STARTED')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (mag) {
      await (supabase.from('magazines') as any)
        .update({ processing_status: 'PROCESSING' })
        .eq('id', mag.id);

      return {
        id: `fallback-job-${mag.id}`,
        magazine_id: mag.id,
        status: 'PROCESSING',
        attempts: 1,
        max_attempts: 5,
        available_at: new Date().toISOString(),
        locked_at: new Date().toISOString(),
        locked_by: workerId,
        last_error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  } catch (magFallbackErr) {
    console.warn('[PDF_QUEUE] Direct magazine queue fallback error:', magFallbackErr);
  }

  return null;
}

/**
 * Atomically claims a job for a specific magazine
 */
export async function claimSpecificMagazineJob(
  magazineId: string,
  workerId: string
): Promise<PdfProcessingJob | null> {
  const supabase = createAdminClient();

  try {
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('claim_magazine_pdf_job', {
      p_magazine_id: magazineId,
      p_worker_id: workerId,
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      return rpcData[0] as PdfProcessingJob;
    }
  } catch {
    // Fall back to direct query
  }

  try {
    const { data: candidate, error: candErr } = await (supabase
      .from('pdf_processing_jobs') as any)
      .select('id, attempts, max_attempts')
      .eq('magazine_id', magazineId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (candErr) {
      throw candErr;
    }

    if (!candidate) {
      // If no job record exists yet, create and claim it
      const { data: inserted, error: insertErr } = await (supabase
        .from('pdf_processing_jobs') as any)
        .insert({
          magazine_id: magazineId,
          status: 'PROCESSING',
          locked_at: new Date().toISOString(),
          locked_by: workerId,
          attempts: 1,
        })
        .select('*')
        .single();

      if (insertErr || !inserted) {
        throw insertErr || new Error('Insert failed');
      }
      return inserted as PdfProcessingJob;
    }

    const { data: claimed, error: claimErr } = await (supabase
      .from('pdf_processing_jobs') as any)
      .update({
        status: 'PROCESSING',
        locked_at: new Date().toISOString(),
        locked_by: workerId,
        attempts: (candidate.attempts || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate.id)
      .select('*')
      .single();

    if (claimErr || !claimed) return null;
    return claimed as PdfProcessingJob;
  } catch (err) {
    // Fallback directly to magazines table if pdf_processing_jobs table is missing
    try {
      const { data: mag } = await (supabase
        .from('magazines') as any)
        .select('id, processing_status')
        .eq('id', magazineId)
        .maybeSingle();

      if (mag) {
        return {
          id: `fallback-mag-${mag.id}`,
          magazine_id: mag.id,
          status: 'PROCESSING',
          attempts: 1,
          max_attempts: 5,
          available_at: new Date().toISOString(),
          locked_at: new Date().toISOString(),
          locked_by: workerId,
          last_error: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    } catch (magFallbackErr) {
      console.warn(`[PDF_QUEUE] Fallback error for magazine ${magazineId}:`, magFallbackErr);
    }
    return null;
  }
}

/**
 * Dispatches an asynchronous internal HTTP trigger to the worker endpoint
 * so the next chunk executes automatically in a new serverless container.
 */
export function dispatchWorkerContinuation(magazineId?: string): void {
  const baseUrl = getInternalWorkerBaseUrl();
  const secret = getInternalWorkerSecret();
  const workerUrl = `${baseUrl}/api/worker/pdf-process`;

  console.log(`[PDF_JOB] CONTINUATION_DISPATCH url=${workerUrl} target_magazine=${magazineId || 'any'}`);

  // Non-blocking fire-and-forget fetch with short abort controller
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (secret) {
      headers['Authorization'] = `Bearer ${secret}`;
      headers['x-worker-secret'] = secret;
    }

    fetch(workerUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source: 'self-continuation',
        magazineId: magazineId || undefined,
      }),
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timeoutId);
        console.log(`[PDF_JOB] CONTINUATION_ACK status=${res.status}`);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        // Abort / background disconnect is expected for fire-and-forget
        console.log(`[PDF_JOB] CONTINUATION_SENT (${err.name === 'AbortError' ? 'dispatched' : err.message})`);
      });
  } catch (err) {
    console.warn('[PDF_JOB] Non-critical continuation dispatch note:', err);
  }
}

/**
 * Main queue consumer function: Claims next job, processes 4 pages,
 * and if pages remain, triggers autonomous continuation independently of any browser.
 */
export async function consumeNextPdfJob(targetMagazineId?: string): Promise<ProcessQueueResult> {
  const workerId = `worker-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now()}`;
  console.log(`[PDF_QUEUE] CONSUME_START worker_id=${workerId} target_magazine=${targetMagazineId || 'next_in_queue'}`);

  // 1. Atomically claim job
  const job = targetMagazineId
    ? await claimSpecificMagazineJob(targetMagazineId, workerId)
    : await claimNextQueuedJob(workerId);

  if (!job) {
    console.log(`[PDF_QUEUE] NO_JOBS_AVAILABLE worker_id=${workerId}`);
    return { hasJob: false };
  }

  const magazineId = job.magazine_id;
  console.log(`[PDF_QUEUE] JOB_ACTIVE job_id=${job.id} publication_id=${magazineId} attempt=${job.attempts}`);

  try {
    // 2. Process exactly 1 chunk (4 pages)
    const result = await processMagazinePdf(magazineId, {
      maxPagesPerRun: 4,
    });

    // 3. Check if more pages remain
    if (result.success && !result.completed && (result.remainingPages || 0) > 0) {
      console.log(
        `[PDF_QUEUE] CHUNK_PROCESSED publication_id=${magazineId} remaining=${result.remainingPages} -> DISPATCHING_NEXT_CHUNK`
      );

      // Trigger next chunk asynchronously in background
      dispatchWorkerContinuation(magazineId);
    } else if (result.completed) {
      console.log(`[PDF_QUEUE] JOB_COMPLETED_SUCCESSFULLY publication_id=${magazineId} total_pages=${result.pageCount}`);
    }

    return {
      hasJob: true,
      jobId: job.id,
      magazineId,
      result,
    };
  } catch (err: any) {
    console.error(`[PDF_QUEUE] JOB_FAILED publication_id=${magazineId} error=${err.message}`);
    return {
      hasJob: true,
      jobId: job.id,
      magazineId,
      error: err.message,
    };
  }
}
