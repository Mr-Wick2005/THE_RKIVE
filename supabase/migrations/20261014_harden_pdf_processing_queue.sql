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
