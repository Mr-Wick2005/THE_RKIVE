-- ==============================================================================
-- COLLEGE DIGITAL MAGAZINE PLATFORM - DATABASE SCHEMA
-- Module 01: Foundation, Database, Authentication & Access Control
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. DROP EXISTING OBJECTS (FOR CLEAN MIGRATION IF NEEDED)
-- DROP TABLE IF EXISTS public.magazines CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TABLE IF EXISTS public.departments CASCADE;
-- DROP TYPE IF EXISTS user_role CASCADE;
-- DROP TYPE IF EXISTS magazine_status CASCADE;

-- 3. CUSTOM ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'DEPARTMENT_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE magazine_status AS ENUM (
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'APPROVED',
        'PUBLISHED',
        'REJECTED',
        'ARCHIVED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

-- 4. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'DEPARTMENT_ADMIN',
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. MAGAZINES TABLE
CREATE TABLE IF NOT EXISTS public.magazines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    academic_year TEXT NOT NULL,
    edition TEXT,
    volume TEXT,
    issue TEXT,
    cover_image_url TEXT,
    original_pdf_url TEXT,
    page_count INTEGER NOT NULL DEFAULT 0,
    status magazine_status NOT NULL DEFAULT 'DRAFT',
    processing_status magazine_processing_status NOT NULL DEFAULT 'NOT_STARTED',
    processing_error TEXT,
    rejection_reason TEXT,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6b. MAGAZINE PAGES TABLE
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

-- 6c. MAGAZINE STATUS HISTORY TABLE (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.magazine_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    from_status magazine_status,
    to_status magazine_status NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. INDEXES FOR HIGH-PERFORMANCE QUERIES
CREATE INDEX IF NOT EXISTS idx_departments_slug ON public.departments(slug);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON public.departments(is_active);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_magazines_department_id ON public.magazines(department_id);
CREATE INDEX IF NOT EXISTS idx_magazines_status ON public.magazines(status);
CREATE INDEX IF NOT EXISTS idx_magazines_processing_status ON public.magazines(processing_status);
CREATE INDEX IF NOT EXISTS idx_magazines_slug ON public.magazines(slug);
CREATE INDEX IF NOT EXISTS idx_magazines_academic_year ON public.magazines(academic_year);
CREATE INDEX IF NOT EXISTS idx_magazines_published_at ON public.magazines(published_at);
CREATE INDEX IF NOT EXISTS idx_magazines_created_by ON public.magazines(created_by);

CREATE INDEX IF NOT EXISTS idx_magazine_pages_magazine_id ON public.magazine_pages(magazine_id);
CREATE INDEX IF NOT EXISTS idx_magazine_pages_page_number ON public.magazine_pages(magazine_id, page_number);

CREATE INDEX IF NOT EXISTS idx_magazine_status_history_mag_id ON public.magazine_status_history(magazine_id);
CREATE INDEX IF NOT EXISTS idx_magazine_status_history_created_at ON public.magazine_status_history(created_at DESC);

-- 8. AUTOMATIC updated_at TIMESTAMP FUNCTION & TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_departments_updated_at ON public.departments;
CREATE TRIGGER set_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_magazines_updated_at ON public.magazines;
CREATE TRIGGER set_magazines_updated_at
    BEFORE UPDATE ON public.magazines
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 9. SECURITY DEFINER HELPER FUNCTIONS (PREVENTS RLS RECURSION)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = user_id AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_department_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT department_id FROM public.profiles WHERE id = user_id AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'SUPER_ADMIN' AND is_active = true
    );
$$;

-- 10. AUTH PROFILE CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role public.user_role;
    v_department_id UUID;
    v_full_name TEXT;
    v_dept_text TEXT;
BEGIN
    -- 1. Determine role safely without casting exceptions
    IF (NEW.raw_user_meta_data->>'role') = 'SUPER_ADMIN' THEN
        v_role := 'SUPER_ADMIN'::public.user_role;
    ELSE
        v_role := 'DEPARTMENT_ADMIN'::public.user_role;
    END IF;

    -- 2. Extract full name safely with fallback to email or default
    v_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.email), ''),
        'College Administrator'
    );

    -- 3. Extract and validate department_id if present (must match UUID format)
    v_dept_text := TRIM(COALESCE(NEW.raw_user_meta_data->>'department_id', ''));
    IF v_dept_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        -- Verify that the department actually exists before assigning foreign key
        IF EXISTS (SELECT 1 FROM public.departments WHERE id = v_dept_text::UUID) THEN
            v_department_id := v_dept_text::UUID;
        ELSE
            v_department_id := NULL;
        END IF;
    ELSE
        v_department_id := NULL;
    END IF;

    -- 4. Insert or update into public.profiles
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        role,
        department_id,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_full_name,
        COALESCE(NEW.email, ''),
        v_role,
        v_department_id,
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        department_id = EXCLUDED.department_id,
        is_active = EXCLUDED.is_active,
        updated_at = now();

    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazines ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- DEPARTMENTS POLICIES
-- ------------------------------------------------------------------------------

-- Public & Authenticated users can view active departments
DROP POLICY IF EXISTS "Public can view active departments" ON public.departments;
CREATE POLICY "Public can view active departments"
    ON public.departments
    FOR SELECT
    USING (is_active = true OR public.is_super_admin(auth.uid()));

-- Only Super Admins can insert/update/delete departments
DROP POLICY IF EXISTS "Super Admins can insert departments" ON public.departments;
CREATE POLICY "Super Admins can insert departments"
    ON public.departments
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super Admins can update departments" ON public.departments;
CREATE POLICY "Super Admins can update departments"
    ON public.departments
    FOR UPDATE
    TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super Admins can delete departments" ON public.departments;
CREATE POLICY "Super Admins can delete departments"
    ON public.departments
    FOR DELETE
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Super Admins can read all profiles
DROP POLICY IF EXISTS "Super Admins can read all profiles" ON public.profiles;
CREATE POLICY "Super Admins can read all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- Department Admins can view profiles in their own department
DROP POLICY IF EXISTS "Dept Admins can view colleagues in department" ON public.profiles;
CREATE POLICY "Dept Admins can view colleagues in department"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        department_id IS NOT NULL 
        AND department_id = public.get_user_department_id(auth.uid())
    );

-- Super Admins can manage all profiles
DROP POLICY IF EXISTS "Super Admins can insert profiles" ON public.profiles;
CREATE POLICY "Super Admins can insert profiles"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super Admins can update profiles" ON public.profiles;
CREATE POLICY "Super Admins can update profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super Admins can delete profiles" ON public.profiles;
CREATE POLICY "Super Admins can delete profiles"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- Users can update basic info of their own profile (cannot change role or department_id)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id 
        AND role = public.get_user_role(auth.uid())
        AND department_id IS NOT DISTINCT FROM public.get_user_department_id(auth.uid())
    );

-- ------------------------------------------------------------------------------
-- MAGAZINES POLICIES
-- ------------------------------------------------------------------------------

-- 1. Public Read: Can read ONLY PUBLISHED magazines
DROP POLICY IF EXISTS "Public can view published magazines" ON public.magazines;
CREATE POLICY "Public can view published magazines"
    ON public.magazines
    FOR SELECT
    USING (status = 'PUBLISHED');

-- 2. Super Admin Read: Can read all magazines
DROP POLICY IF EXISTS "Super Admins can read all magazines" ON public.magazines;
CREATE POLICY "Super Admins can read all magazines"
    ON public.magazines
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- 3. Department Admin Read: Can read all magazines belonging to their department
DROP POLICY IF EXISTS "Dept Admins can read own department magazines" ON public.magazines;
CREATE POLICY "Dept Admins can read own department magazines"
    ON public.magazines
    FOR SELECT
    TO authenticated
    USING (
        department_id = public.get_user_department_id(auth.uid())
    );

-- 4. Super Admin Management: Full INSERT / UPDATE / DELETE
DROP POLICY IF EXISTS "Super Admins can insert any magazine" ON public.magazines;
CREATE POLICY "Super Admins can insert any magazine"
    ON public.magazines
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super Admins can update any magazine" ON public.magazines;
CREATE POLICY "Super Admins can update any magazine"
    ON public.magazines
    FOR UPDATE
    TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super Admins can delete any magazine" ON public.magazines;
CREATE POLICY "Super Admins can delete any magazine"
    ON public.magazines
    FOR DELETE
    TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- 5. Department Admin Management:
-- Can insert ONLY for their own department with initial DRAFT or SUBMITTED status
DROP POLICY IF EXISTS "Dept Admins can insert own department magazine" ON public.magazines;
CREATE POLICY "Dept Admins can insert own department magazine"
    ON public.magazines
    FOR INSERT
    TO authenticated
    WITH CHECK (
        department_id = public.get_user_department_id(auth.uid())
        AND created_by = auth.uid()
        AND status IN ('DRAFT', 'SUBMITTED')
    );

-- Can update ONLY their own department's magazines, and cannot unilaterally approve/publish them
DROP POLICY IF EXISTS "Dept Admins can update own department magazine" ON public.magazines;
CREATE POLICY "Dept Admins can update own department magazine"
    ON public.magazines
    FOR UPDATE
    TO authenticated
    USING (
        department_id = public.get_user_department_id(auth.uid())
    )
    WITH CHECK (
        department_id = public.get_user_department_id(auth.uid())
        AND (
            status IN ('DRAFT', 'SUBMITTED') 
            OR (status = (SELECT m.status FROM public.magazines m WHERE m.id = id))
        )
    );

-- Can delete ONLY DRAFT magazines in their own department
DROP POLICY IF EXISTS "Dept Admins can delete draft magazine" ON public.magazines;
CREATE POLICY "Dept Admins can delete draft magazine"
    ON public.magazines
    FOR DELETE
    TO authenticated
    USING (
        department_id = public.get_user_department_id(auth.uid())
        AND status = 'DRAFT'
    );

-- ------------------------------------------------------------------------------
-- MAGAZINE_PAGES POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.magazine_pages ENABLE ROW LEVEL SECURITY;

-- 1. Public Read: Can view pages belonging ONLY to PUBLISHED magazines
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

-- 2. Super Admin Read & Write: Can manage all magazine pages
DROP POLICY IF EXISTS "Super Admins can manage all magazine pages" ON public.magazine_pages;
CREATE POLICY "Super Admins can manage all magazine pages"
    ON public.magazine_pages
    FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- 3. Department Admin Read: Can read pages belonging to own department's magazines
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

-- 4. Department Admin Write: Can insert/update/delete pages for own department magazines
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

DROP TRIGGER IF EXISTS set_magazine_pages_updated_at ON public.magazine_pages;
CREATE TRIGGER set_magazine_pages_updated_at
    BEFORE UPDATE ON public.magazine_pages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 12. STORAGE BUCKETS & POLICIES SETUP
-- ==============================================================================

-- Create buckets if they do not exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('magazine-covers', 'magazine-covers', true),
    ('magazine-pdfs', 'magazine-pdfs', false),
    ('magazine-pages', 'magazine-pages', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Public read for covers and pages
DROP POLICY IF EXISTS "Public can view magazine covers" ON storage.objects;
CREATE POLICY "Public can view magazine covers"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'magazine-covers');

DROP POLICY IF EXISTS "Public can view magazine pages" ON storage.objects;
CREATE POLICY "Public can view magazine pages"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'magazine-pages');

-- Authenticated upload & manage policies for storage
DROP POLICY IF EXISTS "Authenticated users can upload covers" ON storage.objects;
CREATE POLICY "Authenticated users can upload covers"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'magazine-covers');

DROP POLICY IF EXISTS "Authenticated users can upload pdfs" ON storage.objects;
CREATE POLICY "Authenticated users can upload pdfs"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'magazine-pdfs');

DROP POLICY IF EXISTS "Authenticated users can upload pages" ON storage.objects;
CREATE POLICY "Authenticated users can upload pages"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'magazine-pages');

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

