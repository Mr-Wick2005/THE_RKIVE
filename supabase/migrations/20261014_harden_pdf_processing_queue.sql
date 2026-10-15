-- ==============================================================================
-- THE RKIVE — DURABLE QUEUE HARDENING & LEASE RECOVERY (ADDITIVE MIGRATION)
-- Migration: Add heartbeat, page progression, error classification & resilient locks
-- ==============================================================================

-- 1. Ensure base queue table exists (if previous migrations were not applied to target environment)
CREATE TABLE IF NOT EXISTS public.pdf_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Additive columns for durable queue observability and heartbeat tracking
ALTER TABLE public.pdf_processing_jobs 
    ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS current_page INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_pages INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS error_type TEXT,
    ADD COLUMN IF NOT EXISTS is_terminal BOOLEAN DEFAULT false;

-- 2. Performance indexes for active job querying and stale detection
CREATE INDEX IF NOT EXISTS idx_pdf_processing_jobs_active_queue 
    ON public.pdf_processing_jobs (status, is_terminal, available_at);

CREATE INDEX IF NOT EXISTS idx_pdf_processing_jobs_heartbeat 
    ON public.pdf_processing_jobs (status, heartbeat_at);

-- 3. Stored Procedure: Atomically claim next queued or stale job with lease expiry
-- Clean up previous single-argument signatures to avoid PostgreSQL 42725 function ambiguity
DROP FUNCTION IF EXISTS public.claim_next_pdf_job(TEXT);
DROP FUNCTION IF EXISTS public.claim_magazine_pdf_job(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.claim_next_pdf_job(
    p_worker_id TEXT,
    p_lease_seconds INT DEFAULT 120
)
RETURNS SETOF public.pdf_processing_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.pdf_processing_jobs
    SET status = 'PROCESSING',
        locked_at = now(),
        locked_by = p_worker_id,
        heartbeat_at = now(),
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = (
        SELECT id FROM public.pdf_processing_jobs
        WHERE is_terminal = false
          AND (
            status = 'QUEUED' 
            OR (
                status = 'PROCESSING' 
                AND COALESCE(heartbeat_at, locked_at) < now() - (p_lease_seconds || ' seconds')::interval
            )
          )
          AND available_at <= now()
          AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$;

-- 4. Stored Procedure: Atomically claim a specific magazine job
CREATE OR REPLACE FUNCTION public.claim_magazine_pdf_job(
    p_magazine_id UUID,
    p_worker_id TEXT,
    p_lease_seconds INT DEFAULT 120
)
RETURNS SETOF public.pdf_processing_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.pdf_processing_jobs
    SET status = 'PROCESSING',
        locked_at = now(),
        locked_by = p_worker_id,
        heartbeat_at = now(),
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = (
        SELECT id FROM public.pdf_processing_jobs
        WHERE magazine_id = p_magazine_id
          AND is_terminal = false
          AND (
            status = 'QUEUED'
            OR (
                status = 'PROCESSING' 
                AND COALESCE(heartbeat_at, locked_at) < now() - (p_lease_seconds || ' seconds')::interval
            )
          )
          AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$;

-- 5. Stored Procedure: Worker heartbeat to renew active lease and update page progress
CREATE OR REPLACE FUNCTION public.heartbeat_pdf_job(
    p_job_id UUID,
    p_worker_id TEXT,
    p_current_page INT,
    p_total_pages INT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated INT;
BEGIN
    UPDATE public.pdf_processing_jobs
    SET heartbeat_at = now(),
        current_page = GREATEST(current_page, p_current_page),
        total_pages = COALESCE(NULLIF(p_total_pages, 0), total_pages),
        updated_at = now()
    WHERE id = p_job_id
      AND locked_by = p_worker_id
      AND status = 'PROCESSING';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$;

-- 6. Stored Procedure: Safely release or finalize a job
CREATE OR REPLACE FUNCTION public.release_pdf_job(
    p_job_id UUID,
    p_worker_id TEXT,
    p_status TEXT,
    p_error TEXT DEFAULT NULL,
    p_error_type TEXT DEFAULT NULL,
    p_is_terminal BOOLEAN DEFAULT false,
    p_retry_delay_seconds INT DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated INT;
BEGIN
    UPDATE public.pdf_processing_jobs
    SET status = p_status,
        locked_at = NULL,
        locked_by = NULL,
        last_error = p_error,
        error_type = p_error_type,
        is_terminal = p_is_terminal,
        available_at = now() + (p_retry_delay_seconds || ' seconds')::interval,
        updated_at = now()
    WHERE id = p_job_id
      AND (locked_by = p_worker_id OR locked_by IS NULL);

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_next_pdf_job(TEXT, INT) TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_magazine_pdf_job(UUID, TEXT, INT) TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_pdf_job(UUID, TEXT, INT, INT) TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_pdf_job(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INT) TO postgres, authenticated, service_role;

-- 7. Hardened pg_cron trigger function with heartbeat-awareness (prevents overlapping worker executions)
CREATE OR REPLACE FUNCTION public.trigger_pdf_worker_cron(
  p_worker_url text DEFAULT 'https://the-rkive.vercel.app/api/worker/pdf-process'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net, vault
AS $$
DECLARE
  v_request_id bigint;
  v_has_pending_jobs boolean := false;
  v_secret text := NULL;
BEGIN
  -- Step 1: Check if any non-terminal jobs are QUEUED or genuinely stalled (> 2 minutes without heartbeat)
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM public.pdf_processing_jobs
      WHERE is_terminal = false
        AND (
          (status = 'QUEUED' AND available_at <= NOW() AND attempts < max_attempts)
          OR (status = 'PROCESSING' AND COALESCE(heartbeat_at, locked_at) < NOW() - INTERVAL '2 minutes' AND attempts < max_attempts)
        )
    ) INTO v_has_pending_jobs;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM public.magazines
        WHERE processing_status IN ('QUEUED', 'PROCESSING')
      ) INTO v_has_pending_jobs;
    EXCEPTION WHEN OTHERS THEN
      v_has_pending_jobs := false;
    END;
  END;

  -- Step 2: If no work is pending, exit immediately without network overhead
  IF v_has_pending_jobs IS NOT TRUE THEN
    RETURN 0;
  END IF;

  -- Step 3: Retrieve PDF_WORKER_SECRET from Supabase Vault
  BEGIN
    SELECT decrypted_secret
    INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name = 'pdf_worker_secret'
    ORDER BY created_at DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

  -- If vault is not configured or secret is missing, exit cleanly
  IF v_secret IS NULL OR length(trim(v_secret)) = 0 THEN
    RETURN 0;
  END IF;

  -- Step 4: Dispatch non-blocking HTTP POST via pg_net
  BEGIN
    SELECT net.http_post(
      url := p_worker_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret,
        'x-worker-secret', v_secret
      ),
      body := jsonb_build_object(
        'source', 'supabase_pg_cron',
        'dispatched_at', EXTRACT(EPOCH FROM NOW())::text
      ),
      timeout_milliseconds := 5000
    ) INTO v_request_id;
  EXCEPTION WHEN OTHERS THEN
    v_request_id := 0;
  END;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_pdf_worker_cron(text) TO postgres, service_role;

