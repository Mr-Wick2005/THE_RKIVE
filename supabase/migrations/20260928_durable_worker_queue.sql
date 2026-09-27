-- ==============================================================================
-- MODULE 07: ATOMIC JOB CLAIMING & DURABLE QUEUE FUNCTIONS
-- Migration: Stored procedures for concurrency-safe worker claiming
-- ==============================================================================

-- 1. Atomically claim the next available job in the queue
CREATE OR REPLACE FUNCTION public.claim_next_pdf_job(p_worker_id TEXT)
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
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = (
        SELECT id FROM public.pdf_processing_jobs
        WHERE (
            status = 'QUEUED' 
            OR (status = 'PROCESSING' AND locked_at < now() - INTERVAL '2 minutes')
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

-- 2. Atomically claim a job for a specific magazine
CREATE OR REPLACE FUNCTION public.claim_magazine_pdf_job(p_magazine_id UUID, p_worker_id TEXT)
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
        attempts = attempts + 1,
        updated_at = now()
    WHERE id = (
        SELECT id FROM public.pdf_processing_jobs
        WHERE magazine_id = p_magazine_id
          AND (
            status = 'QUEUED'
            OR (status = 'PROCESSING' AND locked_at < now() - INTERVAL '2 minutes')
          )
          AND attempts < max_attempts
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_next_pdf_job(TEXT) TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_magazine_pdf_job(UUID, TEXT) TO postgres, authenticated, service_role;
