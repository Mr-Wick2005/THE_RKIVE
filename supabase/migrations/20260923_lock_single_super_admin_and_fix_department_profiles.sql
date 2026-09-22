-- Lock the established Super Admin account and repair Department Admin profiles
-- created while the old trigger read user_metadata instead of app_metadata.

DO $$
BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE role = 'SUPER_ADMIN') <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one existing SUPER_ADMIN profile before applying this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_super_admin
  ON public.profiles ((role))
  WHERE role = 'SUPER_ADMIN';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role public.user_role := 'DEPARTMENT_ADMIN';
  v_department_id UUID;
  v_department_text TEXT := trim(coalesce(NEW.raw_app_meta_data ->> 'department_id', ''));
BEGIN
  -- Normal provisioning may only create Department Admin accounts. A second
  -- SUPER_ADMIN profile is rejected atomically by this trigger and unique index.
  IF NEW.raw_app_meta_data ->> 'role' = 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Creating additional SUPER_ADMIN accounts is not permitted';
  END IF;

  IF v_department_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     AND EXISTS (SELECT 1 FROM public.departments WHERE id = v_department_text::uuid AND is_active) THEN
    v_department_id := v_department_text::uuid;
  ELSE
    RAISE EXCEPTION 'Department Admin provisioning requires an active department';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, department_id, is_active)
  VALUES (
    NEW.id,
    coalesce(nullif(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), NEW.email, 'College Administrator'),
    coalesce(NEW.email, ''),
    v_role,
    v_department_id,
    true
  );
  RETURN NEW;
END;
$$;

-- Repair existing Department Admin profiles using the immutable app_metadata
-- written by auth.admin.createUser. This does not create users or change roles.
UPDATE public.profiles p
SET department_id = (u.raw_app_meta_data ->> 'department_id')::uuid,
    updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND p.role = 'DEPARTMENT_ADMIN'
  AND p.department_id IS NULL
  AND (u.raw_app_meta_data ->> 'department_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.departments d
    WHERE d.id = (u.raw_app_meta_data ->> 'department_id')::uuid
      AND d.is_active
  );
