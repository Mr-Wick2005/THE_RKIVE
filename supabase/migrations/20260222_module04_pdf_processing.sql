-- ==============================================================================
-- MODULE 04: PDF INGESTION, PAGE EXTRACTION & DOCUMENT PROCESSING PIPELINE
-- Database Migration: magazine_pages, processing_status, and RLS
-- ==============================================================================

-- 1. PROCESSING STATUS ENUM
DO $$ BEGIN
    CREATE TYPE magazine_processing_status AS ENUM (
        'NOT_STARTED',
        'QUEUED',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ALTER MAGAZINES TABLE WITH PROCESSING FIELDS
ALTER TABLE public.magazines 
    ADD COLUMN IF NOT EXISTS processing_status magazine_processing_status NOT NULL DEFAULT 'NOT_STARTED',
    ADD COLUMN IF NOT EXISTS processing_error TEXT,
    ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Index for processing status
CREATE INDEX IF NOT EXISTS idx_magazines_processing_status ON public.magazines(processing_status);

-- 3. CREATE MAGAZINE_PAGES TABLE
CREATE TABLE IF NOT EXISTS public.magazine_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL CHECK (page_number >= 1),
    image_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT 'image/webp',
    render_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_magazine_pages_number UNIQUE (magazine_id, page_number)
);

-- 4. INDEXES FOR MAGAZINE_PAGES
CREATE INDEX IF NOT EXISTS idx_magazine_pages_magazine_id ON public.magazine_pages(magazine_id);
CREATE INDEX IF NOT EXISTS idx_magazine_pages_page_number ON public.magazine_pages(magazine_id, page_number);

-- 5. AUTOMATIC updated_at TRIGGER FOR MAGAZINE_PAGES
DROP TRIGGER IF EXISTS set_magazine_pages_updated_at ON public.magazine_pages;
CREATE TRIGGER set_magazine_pages_updated_at
    BEFORE UPDATE ON public.magazine_pages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.magazine_pages ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR MAGAZINE_PAGES

-- A. Public can read pages of PUBLISHED magazines only
DROP POLICY IF EXISTS "Public can view published magazine pages" ON public.magazine_pages;
CREATE POLICY "Public can view published magazine pages"
    ON public.magazine_pages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.magazines m
            WHERE m.id = magazine_pages.magazine_id
            AND m.status = 'PUBLISHED'
        )
    );

-- B. Super Admins can manage all magazine pages
DROP POLICY IF EXISTS "Super Admins can manage all magazine pages" ON public.magazine_pages;
CREATE POLICY "Super Admins can manage all magazine pages"
    ON public.magazine_pages
    FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- C. Department Admins can view own department magazine pages
DROP POLICY IF EXISTS "Dept Admins can view own department magazine pages" ON public.magazine_pages;
CREATE POLICY "Dept Admins can view own department magazine pages"
    ON public.magazine_pages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.magazines m
            WHERE m.id = magazine_pages.magazine_id
            AND m.department_id = public.get_user_department_id(auth.uid())
        )
    );

-- D. Department Admins can insert pages for own department magazines
DROP POLICY IF EXISTS "Dept Admins can insert own department magazine pages" ON public.magazine_pages;
CREATE POLICY "Dept Admins can insert own department magazine pages"
    ON public.magazine_pages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.magazines m
            WHERE m.id = magazine_pages.magazine_id
            AND m.department_id = public.get_user_department_id(auth.uid())
        )
    );

-- E. Department Admins can update own department magazine pages
DROP POLICY IF EXISTS "Dept Admins can update own department magazine pages" ON public.magazine_pages;
CREATE POLICY "Dept Admins can update own department magazine pages"
    ON public.magazine_pages
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.magazines m
            WHERE m.id = magazine_pages.magazine_id
            AND m.department_id = public.get_user_department_id(auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.magazines m
            WHERE m.id = magazine_pages.magazine_id
            AND m.department_id = public.get_user_department_id(auth.uid())
        )
    );

-- F. Department Admins can delete own department magazine pages
DROP POLICY IF EXISTS "Dept Admins can delete own department magazine pages" ON public.magazine_pages;
CREATE POLICY "Dept Admins can delete own department magazine pages"
    ON public.magazine_pages
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.magazines m
            WHERE m.id = magazine_pages.magazine_id
            AND m.department_id = public.get_user_department_id(auth.uid())
        )
    );

-- 8. STORAGE BUCKET magazine-pages UPDATE POLICIES
-- Update storage bucket permissions for update/delete as well
DROP POLICY IF EXISTS "Authenticated users can update pages" ON storage.objects;
CREATE POLICY "Authenticated users can update pages"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'magazine-pages')
    WITH CHECK (bucket_id = 'magazine-pages');

DROP POLICY IF EXISTS "Authenticated users can delete pages" ON storage.objects;
CREATE POLICY "Authenticated users can delete pages"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'magazine-pages');
