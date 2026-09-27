-- ==============================================================================
-- MODULE 06: DURABLE SERVERLESS PDF PROCESSING QUEUE
-- Migration: pdf_processing_jobs table, atomic locking, indexes, and RLS
-- ==============================================================================

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

-- Index for queue polling and locking
CREATE INDEX IF NOT EXISTS idx_pdf_processing_jobs_queue 
    ON public.pdf_processing_jobs(status, available_at);

-- Index for magazine lookup
CREATE INDEX IF NOT EXISTS idx_pdf_processing_jobs_magazine_id 
    ON public.pdf_processing_jobs(magazine_id);

-- Automatic updated_at trigger
DROP TRIGGER IF EXISTS set_pdf_processing_jobs_updated_at ON public.pdf_processing_jobs;
CREATE TRIGGER set_pdf_processing_jobs_updated_at
    BEFORE UPDATE ON public.pdf_processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.pdf_processing_jobs ENABLE ROW LEVEL SECURITY;

-- 1. Super Admins can manage all pdf processing jobs
DROP POLICY IF EXISTS "Super Admins can manage all pdf jobs" ON public.pdf_processing_jobs;
CREATE POLICY "Super Admins can manage all pdf jobs"
    ON public.pdf_processing_jobs
    FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- 2. Department Admins can view jobs for their own department magazines
DROP POLICY IF EXISTS "Dept Admins can view own department pdf jobs" ON public.pdf_processing_jobs;
CREATE POLICY "Dept Admins can view own department pdf jobs"
    ON public.pdf_processing_jobs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.magazines m
            WHERE m.id = pdf_processing_jobs.magazine_id
            AND m.department_id = public.get_user_department_id(auth.uid())
        )
    );

-- 3. Department Admins can insert jobs for their own department magazines
DROP POLICY IF EXISTS "Dept Admins can insert own department pdf jobs" ON public.pdf_processing_jobs;
CREATE POLICY "Dept Admins can insert own department pdf jobs"
    ON public.pdf_processing_jobs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.magazines m
            WHERE m.id = pdf_processing_jobs.magazine_id
            AND m.department_id = public.get_user_department_id(auth.uid())
        )
    );
