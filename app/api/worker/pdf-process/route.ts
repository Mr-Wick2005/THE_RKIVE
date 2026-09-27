import { NextResponse } from 'next/server';
import { consumeNextPdfJob, isValidWorkerSecret } from '@/lib/pdf/queue';
import { getCurrentProfile } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s max execution timeout on Node runtime

async function handleWorkerExecution(request: Request) {
  const startTime = Date.now();
  const authHeader = request.headers.get('Authorization');
  const workerSecretHeader = request.headers.get('x-worker-secret');
  let isAuthorized = isValidWorkerSecret(authHeader, workerSecretHeader);

  // If not matching worker secret, check if caller is an active authenticated admin
  if (!isAuthorized && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const profile = await getCurrentProfile(token);
    if (profile && profile.is_active) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized worker invocation' }, { status: 401 });
  }

  // Parse optional target magazine ID from URL query or request body
  let targetMagazineId: string | undefined;

  const url = new URL(request.url);
  const queryMagId = url.searchParams.get('magazineId') || url.searchParams.get('id');
  if (queryMagId) {
    targetMagazineId = queryMagId;
  } else if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    if (body.magazineId || body.id) {
      targetMagazineId = body.magazineId || body.id;
    }
  }

  console.log(`[PDF_WORKER_HTTP] RECEIVED target_magazine=${targetMagazineId || 'any'}`);

  const queueResult = await consumeNextPdfJob(targetMagazineId);
  const durationMs = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    hasJob: queueResult.hasJob,
    jobId: queueResult.jobId,
    magazineId: queueResult.magazineId,
    result: queueResult.result,
    error: queueResult.error,
    durationMs,
  });
}

export async function GET(request: Request) {
  return handleWorkerExecution(request);
}

export async function POST(request: Request) {
  return handleWorkerExecution(request);
}
