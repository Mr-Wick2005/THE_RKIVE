-- ==============================================================================
-- MODULE 05: COLLEGE ADMIN REVIEW & APPROVAL SYSTEM
-- Database Migration: rejection_reason & magazine_status_history
-- ==============================================================================

-- 1. ADD REJECTION REASON TO MAGAZINES
ALTER TABLE public.magazines 
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. CREATE MAGAZINE STATUS HISTORY TABLE FOR AUDIT TRAIL
CREATE TABLE IF NOT EXISTS public.magazine_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    from_status magazine_status,
    to_status magazine_status NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEXES FOR STATUS HISTORY
CREATE INDEX IF NOT EXISTS idx_magazine_status_history_mag_id ON public.magazine_status_history(magazine_id);
CREATE INDEX IF NOT EXISTS idx_magazine_status_history_created_at ON public.magazine_status_history(created_at DESC);

-- 4. ENABLE RLS ON STATUS HISTORY
ALTER TABLE public.magazine_status_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR STATUS HISTORY

-- Super Admins can manage all history records
DROP POLICY IF EXISTS "Super Admins can manage all status history" ON public.magazine_status_history;
CREATE POLICY "Super Admins can manage all status history"
    ON public.magazine_status_history
    FOR ALL
    TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- Department Admins can view status history for their department's magazines
DROP POLICY IF EXISTS "Dept Admins can view own department status history" ON public.magazine_status_history;
CREATE POLICY "Dept Admins can view own department status history"
    ON public.magazine_status_history
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.magazines m
            WHERE m.id = magazine_status_history.magazine_id
            AND m.department_id = public.get_user_department_id(auth.uid())
        )
    );

-- Department Admins can insert status history entries for their submissions
DROP POLICY IF EXISTS "Dept Admins can insert status history" ON public.magazine_status_history;
CREATE POLICY "Dept Admins can insert status history"
    ON public.magazine_status_history
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.magazines m
            WHERE m.id = magazine_status_history.magazine_id
            AND m.department_id = public.get_user_department_id(auth.uid())
        )
    );
