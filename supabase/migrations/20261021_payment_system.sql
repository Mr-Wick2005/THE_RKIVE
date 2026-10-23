-- ==============================================================================
-- THE RKIVE — PRODUCTION-GRADE PAYMENT SYSTEM MIGRATION
-- Migration: 20261021_payment_system.sql
-- Modules: Platform Fee, Payment Obligations, Razorpay Attempts, Manual UPI,
--          Webhook Ledger, Financial Audit Logs, and Submission Gating Triggers
-- ==============================================================================

-- 1. CUSTOM ENUMS
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
        'RAZORPAY_QR',
        'MANUAL_UPI',
        'INSTITUTIONAL_EXEMPTION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PLATFORM SETTINGS TABLE (Configurable submission fee)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value_paise INTEGER NOT NULL CHECK (value_paise >= 100 AND value_paise <= 100000),
    currency TEXT NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial ₹20 platform fee if not present (2000 paise)
INSERT INTO public.platform_settings (key, value_paise, currency)
VALUES ('magazine_submission_fee', 2000, 'INR')
ON CONFLICT (key) DO NOTHING;

-- 3. PLATFORM FEE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.platform_fee_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    previous_fee_paise INTEGER NOT NULL CHECK (previous_fee_paise >= 0),
    new_fee_paise INTEGER NOT NULL CHECK (new_fee_paise >= 100 AND new_fee_paise <= 100000),
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    change_reason TEXT NOT NULL CHECK (length(trim(change_reason)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. MAGAZINE PAYMENT OBLIGATIONS TABLE
CREATE TABLE IF NOT EXISTS public.magazine_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status public.payment_status NOT NULL DEFAULT 'PENDING',
    payment_method public.payment_method_type NOT NULL DEFAULT 'RAZORPAY',
    fee_snapshot_paise INTEGER NOT NULL,
    paid_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure at most one active unpaid obligation per magazine
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_obligation 
    ON public.magazine_payments (magazine_id) 
    WHERE status IN ('PENDING', 'MANUAL_VERIFICATION_PENDING');

-- Ensure at most one paid obligation per magazine
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_paid_obligation 
    ON public.magazine_payments (magazine_id) 
    WHERE status = 'PAID';

-- 5. PAYMENT ATTEMPTS TABLE (Gateway Transactions / Orders)
CREATE TABLE IF NOT EXISTS public.payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES public.magazine_payments(id) ON DELETE CASCADE,
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'RAZORPAY',
    provider_order_id TEXT UNIQUE NOT NULL,
    provider_payment_id TEXT UNIQUE,
    provider_signature TEXT,
    amount_paise INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'CREATED', -- 'CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED'
    error_code TEXT,
    error_description TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. MANUAL UPI CLAIMS TABLE
CREATE TABLE IF NOT EXISTS public.manual_upi_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES public.magazine_payments(id) ON DELETE CASCADE,
    magazine_id UUID NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    utr_reference TEXT UNIQUE NOT NULL,
    amount_paise INTEGER NOT NULL,
    submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. WEBHOOK EVENTS LEDGER TABLE (Duplicate-Webhook & Replay Attack Protection)
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    provider_order_id TEXT,
    provider_payment_id TEXT,
    payload_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'PROCESSED',
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. PAYMENT AUDIT LOGS TABLE (Append-Only Financial Events)
CREATE TABLE IF NOT EXISTS public.payment_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    magazine_id UUID REFERENCES public.magazines(id) ON DELETE SET NULL,
    obligation_id UUID REFERENCES public.magazine_payments(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. PERFORMANCE & AUDIT INDEXES
CREATE INDEX IF NOT EXISTS idx_magazine_payments_mag_id ON public.magazine_payments(magazine_id);
CREATE INDEX IF NOT EXISTS idx_magazine_payments_dept_id ON public.magazine_payments(department_id);
CREATE INDEX IF NOT EXISTS idx_magazine_payments_status ON public.magazine_payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_obligation_id ON public.payment_attempts(obligation_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_provider_order ON public.payment_attempts(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_manual_upi_claims_mag_id ON public.manual_upi_claims(magazine_id);
CREATE INDEX IF NOT EXISTS idx_manual_upi_claims_status ON public.manual_upi_claims(status);
CREATE INDEX IF NOT EXISTS idx_manual_upi_claims_utr ON public.manual_upi_claims(utr_reference);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_id ON public.payment_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_mag_id ON public.payment_audit_logs(magazine_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_created_at ON public.payment_audit_logs(created_at DESC);

-- 10. AUTOMATIC updated_at TRIGGERS
DROP TRIGGER IF EXISTS set_platform_settings_updated_at ON public.platform_settings;
CREATE TRIGGER set_platform_settings_updated_at
    BEFORE UPDATE ON public.platform_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_magazine_payments_updated_at ON public.magazine_payments;
CREATE TRIGGER set_magazine_payments_updated_at
    BEFORE UPDATE ON public.magazine_payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_payment_attempts_updated_at ON public.payment_attempts;
CREATE TRIGGER set_payment_attempts_updated_at
    BEFORE UPDATE ON public.payment_attempts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_manual_upi_claims_updated_at ON public.manual_upi_claims;
CREATE TRIGGER set_manual_upi_claims_updated_at
    BEFORE UPDATE ON public.manual_upi_claims
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 11. DATABASE-LEVEL SUBMISSION & PUBLISHING GATING TRIGGER
CREATE OR REPLACE FUNCTION public.enforce_magazine_submission_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- GATING RULE 1: Transitioning to SUBMITTED requires confirmed payment
    IF NEW.status = 'SUBMITTED' AND (OLD.status IS DISTINCT FROM 'SUBMITTED') THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.magazine_payments
            WHERE magazine_id = NEW.id
              AND status = 'PAID'
        ) THEN
            RAISE EXCEPTION 'Cannot transition magazine % to SUBMITTED without a confirmed payment obligation (PAID).', NEW.id;
        END IF;
    END IF;

    -- GATING RULE 2: Transitioning to PUBLISHED requires confirmed payment
    IF NEW.status = 'PUBLISHED' AND (OLD.status IS DISTINCT FROM 'PUBLISHED') THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.magazine_payments
            WHERE magazine_id = NEW.id
              AND status = 'PAID'
        ) THEN
            RAISE EXCEPTION 'Cannot publish magazine % without a confirmed payment obligation (PAID).', NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_magazine_submission_payment ON public.magazines;
CREATE TRIGGER trg_enforce_magazine_submission_payment
    BEFORE INSERT OR UPDATE OF status ON public.magazines
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_magazine_submission_payment();

-- 12. RLS SECURITY POLICIES
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_fee_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazine_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_upi_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Platform Settings Policies
DROP POLICY IF EXISTS "Public can view active platform settings" ON public.platform_settings;
CREATE POLICY "Public can view active platform settings"
    ON public.platform_settings FOR SELECT
    USING (is_active = true OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Super Admins can manage platform settings"
    ON public.platform_settings FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- Platform Fee Audit Logs Policies
DROP POLICY IF EXISTS "Super Admins can view fee audit logs" ON public.platform_fee_audit_logs;
CREATE POLICY "Super Admins can view fee audit logs"
    ON public.platform_fee_audit_logs FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super Admins can insert fee audit logs" ON public.platform_fee_audit_logs;
CREATE POLICY "Super Admins can insert fee audit logs"
    ON public.platform_fee_audit_logs FOR INSERT TO authenticated
    WITH CHECK (public.is_super_admin(auth.uid()));

-- Magazine Payments Policies
DROP POLICY IF EXISTS "Super Admins can manage all magazine payments" ON public.magazine_payments;
CREATE POLICY "Super Admins can manage all magazine payments"
    ON public.magazine_payments FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Dept Admins can view own department magazine payments" ON public.magazine_payments;
CREATE POLICY "Dept Admins can view own department magazine payments"
    ON public.magazine_payments FOR SELECT TO authenticated
    USING (department_id = public.get_user_department_id(auth.uid()));

DROP POLICY IF EXISTS "Dept Admins can create pending payment obligation" ON public.magazine_payments;
CREATE POLICY "Dept Admins can create pending payment obligation"
    ON public.magazine_payments FOR INSERT TO authenticated
    WITH CHECK (
        department_id = public.get_user_department_id(auth.uid())
        AND created_by = auth.uid()
        AND status = 'PENDING'
    );

-- Payment Attempts Policies
DROP POLICY IF EXISTS "Super Admins can view all payment attempts" ON public.payment_attempts;
CREATE POLICY "Super Admins can view all payment attempts"
    ON public.payment_attempts FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Dept Admins can view own department payment attempts" ON public.payment_attempts;
CREATE POLICY "Dept Admins can view own department payment attempts"
    ON public.payment_attempts FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.magazine_payments mp
            WHERE mp.id = payment_attempts.obligation_id
              AND mp.department_id = public.get_user_department_id(auth.uid())
        )
    );

-- Manual UPI Claims Policies
DROP POLICY IF EXISTS "Super Admins can manage all manual UPI claims" ON public.manual_upi_claims;
CREATE POLICY "Super Admins can manage all manual UPI claims"
    ON public.manual_upi_claims FOR ALL TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Dept Admins can view own department UPI claims" ON public.manual_upi_claims;
CREATE POLICY "Dept Admins can view own department UPI claims"
    ON public.manual_upi_claims FOR SELECT TO authenticated
    USING (department_id = public.get_user_department_id(auth.uid()));

DROP POLICY IF EXISTS "Dept Admins can submit manual UPI claims" ON public.manual_upi_claims;
CREATE POLICY "Dept Admins can submit manual UPI claims"
    ON public.manual_upi_claims FOR INSERT TO authenticated
    WITH CHECK (
        department_id = public.get_user_department_id(auth.uid())
        AND submitted_by = auth.uid()
        AND status = 'PENDING'
    );

-- Webhook Events Policies (Restricted exclusively to Super Admins & service role)
DROP POLICY IF EXISTS "Super Admins can view webhook events" ON public.payment_webhook_events;
CREATE POLICY "Super Admins can view webhook events"
    ON public.payment_webhook_events FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- Payment Audit Logs Policies
DROP POLICY IF EXISTS "Super Admins can view all payment audit logs" ON public.payment_audit_logs;
CREATE POLICY "Super Admins can view all payment audit logs"
    ON public.payment_audit_logs FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Dept Admins can view payment audit logs for own department" ON public.payment_audit_logs;
CREATE POLICY "Dept Admins can view payment audit logs for own department"
    ON public.payment_audit_logs FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.magazines m
            WHERE m.id = payment_audit_logs.magazine_id
              AND m.department_id = public.get_user_department_id(auth.uid())
        )
    );

-- 13. RLS HARDENING ON MAGAZINES TABLE
-- Tighten update policy so Department Admins cannot directly set status to 'SUBMITTED'
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
            -- Direct client updates can only maintain current status or transition within drafts/revisions,
            -- NEVER directly setting SUBMITTED without trusted server verification.
            status = (SELECT m.status FROM public.magazines m WHERE m.id = magazines.id)
        )
    );
