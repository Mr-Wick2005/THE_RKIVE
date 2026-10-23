import fs from 'fs';
import path from 'path';
import { getOrCreateDevCredentials } from './generate-dev-credentials.mjs';

const creds = getOrCreateDevCredentials();
const OUTPUT_FILE = path.resolve(process.cwd(), 'supabase/development_setup.sql');

const sql = `-- ==============================================================================
-- THE RKIVE — COMPLETE DEVELOPMENT DATABASE SETUP & TEST ACCOUNTS PROVISIONING
-- Target Project: magazeen local (qbkibltrrheucxuvjxcw)
-- Generated: ${new Date().toISOString()}
--
-- INSTRUCTIONS:
-- Copy and run this entire script in the Supabase SQL Editor for "magazeen local".
-- It creates all required enums, tables, functions, RLS policies, buckets,
-- the demo department, and the two development-only admin test accounts.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CUSTOM ENUMS
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'DEPARTMENT_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.magazine_status AS ENUM (
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
    CREATE TYPE public.magazine_processing_status AS ENUM (
        'NOT_STARTED',
        'QUEUED',
        'PROCESSING',
        'COMPLETED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM (
        'PENDING',
        'PAID',
        'FAILED',
        'MANUAL_VERIFICATION_PENDING',
        'REFUNDED',
        'EXEMPT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method_type AS ENUM (
        'RAZORPAY',
        'MANUAL_UPI',
        'INSTITUTIONAL_EXEMPTION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. CORE APPLICATION TABLES

-- Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    default_submission_fee_paise INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles Table (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'DEPARTMENT_ADMIN'::public.user_role,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure partial unique index on single SUPER_ADMIN
CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_super_admin
  ON public.profiles ((role))
  WHERE role = 'SUPER_ADMIN';

-- Magazines Table
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
    page_count INTEGER NOT NULL DEFAULT 0 CHECK (page_count >= 0),
    status public.magazine_status NOT NULL DEFAULT 'DRAFT'::public.magazine_status,
    processing_status public.magazine_processing_status NOT NULL DEFAULT 'NOT_STARTED'::public.magazine_processing_status,
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

-- Magazine Pages Table
CREATE TABLE IF NOT EXISTS public.magazine_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL CHECK (page_number > 0),
    image_path TEXT NOT NULL,
    thumbnail_path TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    file_size INTEGER,
    mime_type TEXT DEFAULT 'image/webp',
    render_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (magazine_id, page_number)
);

-- Magazine Status History Table
CREATE TABLE IF NOT EXISTS public.magazine_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    from_status public.magazine_status NOT NULL,
    to_status public.magazine_status NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PDF Processing Jobs Queue Table
CREATE TABLE IF NOT EXISTS public.pdf_processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE UNIQUE,
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    last_error TEXT,
    error_type TEXT DEFAULT 'TRANSIENT',
    is_terminal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Fee Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    fee_paise INTEGER NOT NULL CHECK (fee_paise >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform Setting History
CREATE TABLE IF NOT EXISTS public.platform_setting_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_fee_paise INTEGER NOT NULL,
    new_fee_paise INTEGER NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Magazine Payments Table
CREATE TABLE IF NOT EXISTS public.magazine_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status public.payment_status NOT NULL DEFAULT 'PENDING'::public.payment_status,
    payment_method public.payment_method_type NOT NULL DEFAULT 'RAZORPAY'::public.payment_method_type,
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    upi_transaction_ref TEXT,
    manual_verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    manual_verified_at TIMESTAMPTZ,
    manual_notes TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment Audit Ledger Table
CREATE TABLE IF NOT EXISTS public.payment_audit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.magazine_payments(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role TEXT,
    amount_paise INTEGER,
    provider_reference TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment Webhook Events Table
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. HELPER FUNCTIONS & TRIGGERS

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'SUPER_ADMIN' AND is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_department_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT department_id FROM public.profiles
    WHERE id = user_id AND is_active = true;
$$;

-- Trigger: handle_new_user on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role public.user_role := 'DEPARTMENT_ADMIN';
    v_department_id UUID;
    v_full_name TEXT;
    v_dept_text TEXT;
BEGIN
    IF (NEW.raw_app_meta_data->>'role') = 'SUPER_ADMIN' OR (NEW.raw_user_meta_data->>'role') = 'SUPER_ADMIN' THEN
        v_role := 'SUPER_ADMIN'::public.user_role;
    ELSE
        v_role := 'DEPARTMENT_ADMIN'::public.user_role;
    END IF;

    v_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.email), ''),
        'College Administrator'
    );

    v_dept_text := TRIM(COALESCE(NEW.raw_app_meta_data->>'department_id', NEW.raw_user_meta_data->>'department_id', ''));
    IF v_dept_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        IF EXISTS (SELECT 1 FROM public.departments WHERE id = v_dept_text::UUID) THEN
            v_department_id := v_dept_text::UUID;
        ELSE
            v_department_id := NULL;
        END IF;
    ELSE
        v_department_id := NULL;
    END IF;

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_payments ENABLE ROW LEVEL SECURITY;

-- Departments Policies
DROP POLICY IF EXISTS "Public can view active departments" ON public.departments;
CREATE POLICY "Public can view active departments" ON public.departments
    FOR SELECT USING (is_active = true OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super Admin can manage departments" ON public.departments;
CREATE POLICY "Super Admin can manage departments" ON public.departments
    FOR ALL USING (public.is_super_admin(auth.uid()));

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (id = auth.uid() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Department colleagues can view department profiles" ON public.profiles;
CREATE POLICY "Department colleagues can view department profiles" ON public.profiles
    FOR SELECT USING (
        department_id IS NOT NULL AND
        department_id = public.get_user_department_id(auth.uid())
    );

DROP POLICY IF EXISTS "Super Admin can manage all profiles" ON public.profiles;
CREATE POLICY "Super Admin can manage all profiles" ON public.profiles
    FOR ALL USING (public.is_super_admin(auth.uid()));

-- Magazines Policies
DROP POLICY IF EXISTS "Public can view published magazines" ON public.magazines;
CREATE POLICY "Public can view published magazines" ON public.magazines
    FOR SELECT USING (status = 'PUBLISHED' OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Department staff can view own department magazines" ON public.magazines;
CREATE POLICY "Department staff can view own department magazines" ON public.magazines
    FOR SELECT USING (
        department_id = public.get_user_department_id(auth.uid())
    );

DROP POLICY IF EXISTS "Department Admin can insert draft magazines" ON public.magazines;
CREATE POLICY "Department Admin can insert draft magazines" ON public.magazines
    FOR INSERT WITH CHECK (
        department_id = public.get_user_department_id(auth.uid())
        AND status IN ('DRAFT', 'SUBMITTED')
    );

DROP POLICY IF EXISTS "Department Admin can update own department magazines" ON public.magazines;
CREATE POLICY "Department Admin can update own department magazines" ON public.magazines
    FOR UPDATE USING (
        department_id = public.get_user_department_id(auth.uid())
        AND (
            status IN ('DRAFT', 'SUBMITTED')
            OR status = (SELECT m.status FROM public.magazines m WHERE m.id = id)
        )
    );

DROP POLICY IF EXISTS "Super Admin has full access to magazines" ON public.magazines;
CREATE POLICY "Super Admin has full access to magazines" ON public.magazines
    FOR ALL USING (public.is_super_admin(auth.uid()));

-- Pages Policies
DROP POLICY IF EXISTS "Public can view pages of published magazines" ON public.magazine_pages;
CREATE POLICY "Public can view pages of published magazines" ON public.magazine_pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.magazines m
            WHERE m.id = magazine_pages.magazine_id
            AND (m.status = 'PUBLISHED' OR m.department_id = public.get_user_department_id(auth.uid()) OR public.is_super_admin(auth.uid()))
        )
    );

-- Platform Settings Policies
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can read platform settings" ON public.platform_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super Admin can update platform settings" ON public.platform_settings;
CREATE POLICY "Super Admin can update platform settings" ON public.platform_settings
    FOR ALL USING (public.is_super_admin(auth.uid()));

-- Payments Policies
DROP POLICY IF EXISTS "Department Admins view own department payments" ON public.magazine_payments;
CREATE POLICY "Department Admins view own department payments" ON public.magazine_payments
    FOR SELECT USING (
        department_id = public.get_user_department_id(auth.uid())
        OR public.is_super_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Department Admins can create payment records" ON public.magazine_payments;
CREATE POLICY "Department Admins can create payment records" ON public.magazine_payments
    FOR INSERT WITH CHECK (
        department_id = public.get_user_department_id(auth.uid())
        OR public.is_super_admin(auth.uid())
    );

DROP POLICY IF EXISTS "Super Admin can manage payments" ON public.magazine_payments;
CREATE POLICY "Super Admin can manage payments" ON public.magazine_payments
    FOR ALL USING (public.is_super_admin(auth.uid()));

-- Grant table permissions to standard Supabase roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.departments, public.magazines, public.magazine_pages, public.platform_settings TO anon;

-- 6. SEED INITIAL PLATFORM SETTINGS
INSERT INTO public.platform_settings (id, fee_paise, currency)
VALUES ('current', 2000, 'INR')
ON CONFLICT (id) DO UPDATE SET
    fee_paise = EXCLUDED.fee_paise,
    updated_at = now();

-- 7. SEED FICTIONAL DEVELOPMENT DEPARTMENT
INSERT INTO public.departments (
    id,
    name,
    short_name,
    slug,
    description,
    is_active
) VALUES (
    '${creds.deptAdmin.departmentId}',
    '${creds.deptAdmin.departmentName}',
    '${creds.deptAdmin.departmentShort}',
    '${creds.deptAdmin.departmentSlug}',
    'Fictional development department for local testing',
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    is_active = true;

-- 8. PROVISION DEVELOPMENT-ONLY AUTH ACCOUNTS & PROFILES

-- Account 1: Super Admin (superadmin.test@magazeen.local)
DO $$
DECLARE
    v_sa_id UUID;
    v_encrypted_pass TEXT := extensions.crypt('${creds.superAdmin.password}', extensions.gen_salt('bf'));
BEGIN
    SELECT id INTO v_sa_id FROM auth.users WHERE email = '${creds.superAdmin.email}';

    IF v_sa_id IS NULL THEN
        v_sa_id := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_sa_id,
            'authenticated',
            'authenticated',
            '${creds.superAdmin.email}',
            v_encrypted_pass,
            now(),
            '{"provider": "email", "providers": ["email"], "role": "SUPER_ADMIN"}'::jsonb,
            '{"full_name": "${creds.superAdmin.name}"}'::jsonb,
            now(),
            now()
        );
    ELSE
        UPDATE auth.users SET
            encrypted_password = v_encrypted_pass,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_app_meta_data = '{"provider": "email", "providers": ["email"], "role": "SUPER_ADMIN"}'::jsonb,
            raw_user_meta_data = '{"full_name": "${creds.superAdmin.name}"}'::jsonb,
            updated_at = now()
        WHERE id = v_sa_id;
    END IF;

    -- Ensure profile record
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
        v_sa_id,
        '${creds.superAdmin.name}',
        '${creds.superAdmin.email}',
        'SUPER_ADMIN',
        NULL,
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = 'SUPER_ADMIN',
        department_id = NULL,
        is_active = true,
        updated_at = now();
END $$;

-- Account 2: Department Admin (departmentadmin.test@magazeen.local)
DO $$
DECLARE
    v_da_id UUID;
    v_encrypted_pass TEXT := extensions.crypt('${creds.deptAdmin.password}', extensions.gen_salt('bf'));
    v_dept_id UUID := '${creds.deptAdmin.departmentId}'::UUID;
BEGIN
    SELECT id INTO v_da_id FROM auth.users WHERE email = '${creds.deptAdmin.email}';

    IF v_da_id IS NULL THEN
        v_da_id := gen_random_uuid();
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_da_id,
            'authenticated',
            'authenticated',
            '${creds.deptAdmin.email}',
            v_encrypted_pass,
            now(),
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'DEPARTMENT_ADMIN', 'department_id', v_dept_id),
            '{"full_name": "${creds.deptAdmin.name}"}'::jsonb,
            now(),
            now()
        );
    ELSE
        UPDATE auth.users SET
            encrypted_password = v_encrypted_pass,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'DEPARTMENT_ADMIN', 'department_id', v_dept_id),
            raw_user_meta_data = '{"full_name": "${creds.deptAdmin.name}"}'::jsonb,
            updated_at = now()
        WHERE id = v_da_id;
    END IF;

    -- Ensure profile record
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
        v_da_id,
        '${creds.deptAdmin.name}',
        '${creds.deptAdmin.email}',
        'DEPARTMENT_ADMIN',
        v_dept_id,
        true,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = 'DEPARTMENT_ADMIN',
        department_id = v_dept_id,
        is_active = true,
        updated_at = now();
END $$;

-- 9. STORAGE BUCKETS SETUP
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('magazine-covers', 'magazine-covers', true),
    ('magazine-pages', 'magazine-pages', true),
    ('magazine-pdfs', 'magazine-pdfs', false),
    ('cms-assets', 'cms-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Verification check
SELECT
    'Setup Complete' AS status,
    (SELECT count(*) FROM public.departments) AS departments_count,
    (SELECT count(*) FROM public.profiles) AS profiles_count,
    (SELECT count(*) FROM auth.users) AS auth_users_count;
`;

fs.writeFileSync(OUTPUT_FILE, sql, 'utf8');
console.log(`Generated development setup SQL: ${OUTPUT_FILE}`);
