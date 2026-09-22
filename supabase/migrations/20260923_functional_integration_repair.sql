-- Functional integration repair: real department data, secure auth provisioning,
-- and least-privilege policies. Apply this migration to the linked Supabase project.

-- Seed only missing departments; slugs are stable and the statement is idempotent.
INSERT INTO public.departments (id, name, short_name, slug, description, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Computer Engineering', 'COMP', 'computer-engineering', 'Innovations in computing, systems architecture, algorithms, and software development.', true),
  ('a0000000-0000-0000-0000-000000000002', 'Information Technology', 'IT', 'information-technology', 'Information systems, cloud networks, cybersecurity, and enterprise computing.', true),
  ('a0000000-0000-0000-0000-000000000003', 'Artificial Intelligence & Machine Learning', 'AIML', 'artificial-intelligence-machine-learning', 'Frontiers in neural computation, deep learning, cognitive robotics, and intelligent systems.', true),
  ('a0000000-0000-0000-0000-000000000004', 'Electronics & Telecommunication', 'EXTC', 'electronics-telecommunication', 'VLSI design, embedded signal processing, RF engineering, and IoT ecosystems.', true),
  ('a0000000-0000-0000-0000-000000000005', 'Mechanical Engineering', 'MECH', 'mechanical-engineering', 'Thermodynamics, robotics, precision manufacturing, and sustainable automotive engineering.', true),
  ('a0000000-0000-0000-0000-000000000006', 'Civil Engineering', 'CIVIL', 'civil-engineering', 'Structural integrity, smart cities, environmental sustainability, and urban infrastructure.', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Auth users are provisioned only by server-side admin APIs. Role and department
-- come from immutable app_metadata, never user-editable user_metadata.
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
  IF NEW.raw_app_meta_data ->> 'role' = 'SUPER_ADMIN' THEN
    v_role := 'SUPER_ADMIN';
  END IF;

  IF v_role = 'DEPARTMENT_ADMIN'
     AND v_department_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     AND EXISTS (SELECT 1 FROM public.departments WHERE id = v_department_text::uuid AND is_active) THEN
    v_department_id := v_department_text::uuid;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, department_id, is_active)
  VALUES (
    NEW.id,
    coalesce(nullif(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), NEW.email, 'College Administrator'),
    coalesce(NEW.email, ''),
    v_role,
    v_department_id,
    true
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

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid), public.get_user_department_id(uuid), public.is_super_admin(uuid) TO authenticated;

-- The client may inspect department metadata, but only a super admin may change it.
-- The existing RLS policies remain enabled; add explicit grants required by the Data API.
GRANT SELECT ON public.departments TO anon, authenticated;
GRANT SELECT ON public.magazines, public.magazine_pages TO anon, authenticated;
GRANT SELECT ON public.profiles, public.magazine_status_history TO authenticated;

-- Remove the previous broad page-object write policies. The page renderer uses the
-- service role on the server; browser clients never receive write access to pages.
DROP POLICY IF EXISTS "Authenticated users can update pages" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete pages" ON storage.objects;

-- Original PDFs are private and department-scoped. The server-side pipeline uses
-- the service role; direct authenticated uploads are limited to the caller's folder.
DROP POLICY IF EXISTS "Department staff can upload own PDFs" ON storage.objects;
CREATE POLICY "Department staff can upload own PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'magazine-pdfs'
  AND ((storage.foldername(name))[1] = public.get_user_department_id(auth.uid())::text
       OR public.is_super_admin(auth.uid()))
);
