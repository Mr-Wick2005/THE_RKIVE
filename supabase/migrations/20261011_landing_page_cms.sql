-- ==============================================================================
-- THE RKIVE — LANDING PAGE STUDIO CMS MIGRATION
-- Module: Landing Page Studio, Content Architecture, Version History & Media
-- ==============================================================================

-- 1. HOMEPAGE CONFIGS TABLE (DRAFT & PUBLISHED STATE)
CREATE TABLE IF NOT EXISTS public.homepage_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE DEFAULT 'main',
    draft_data JSONB NOT NULL,
    published_data JSONB NOT NULL,
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    draft_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    draft_updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. HOMEPAGE VERSIONS TABLE (AUDIT TRAIL & RESTORATION SNAPSHOTS)
CREATE TABLE IF NOT EXISTS public.homepage_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES public.homepage_configs(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note TEXT,
    change_summary JSONB,
    CONSTRAINT uq_homepage_version_number UNIQUE (config_id, version_number)
);

-- 3. CMS MEDIA ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.cms_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL,
    alt_text TEXT,
    section_tag TEXT,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_homepage_configs_key ON public.homepage_configs(key);
CREATE INDEX IF NOT EXISTS idx_homepage_versions_config_id ON public.homepage_versions(config_id);
CREATE INDEX IF NOT EXISTS idx_homepage_versions_version_number ON public.homepage_versions(version_number DESC);
CREATE INDEX IF NOT EXISTS idx_cms_media_section_tag ON public.cms_media(section_tag);
CREATE INDEX IF NOT EXISTS idx_cms_media_created_at ON public.cms_media(created_at DESC);

-- 5. TRIGGER FOR updated_at
DROP TRIGGER IF EXISTS set_homepage_configs_updated_at ON public.homepage_configs;
CREATE TRIGGER set_homepage_configs_updated_at
    BEFORE UPDATE ON public.homepage_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.homepage_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_media ENABLE ROW LEVEL SECURITY;

-- 6a. Policies for homepage_configs
DROP POLICY IF EXISTS "Public can view published homepage config" ON public.homepage_configs;
CREATE POLICY "Public can view published homepage config"
    ON public.homepage_configs FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Super Admins can mutate homepage configs" ON public.homepage_configs;
CREATE POLICY "Super Admins can mutate homepage configs"
    ON public.homepage_configs FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- 6b. Policies for homepage_versions
DROP POLICY IF EXISTS "Public can view published versions" ON public.homepage_versions;
CREATE POLICY "Public can view published versions"
    ON public.homepage_versions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Super Admins can mutate homepage versions" ON public.homepage_versions;
CREATE POLICY "Super Admins can mutate homepage versions"
    ON public.homepage_versions FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- 6c. Policies for cms_media
DROP POLICY IF EXISTS "Public can view CMS media" ON public.cms_media;
CREATE POLICY "Public can view CMS media"
    ON public.cms_media FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Super Admins can mutate CMS media" ON public.cms_media;
CREATE POLICY "Super Admins can mutate CMS media"
    ON public.cms_media FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));
