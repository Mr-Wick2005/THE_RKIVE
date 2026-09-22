-- ==============================================================================
-- FIX AUTH TRIGGER: handle_new_user()
-- Resolves "Database error saving new user (500)" on Supabase Auth SignUp
-- ==============================================================================

-- 1. Ensure user_role enum exists with all roles
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('SUPER_ADMIN', 'DEPARTMENT_ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Ensure profiles table exists with proper types and nullability
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

-- 3. Replace handle_new_user with SECURITY DEFINER and SET search_path
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

-- 4. Grant execution permissions on the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;

-- 5. Grant table permissions on profiles
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated, anon;

-- 6. Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
