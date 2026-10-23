-- ==============================================================================
-- THE RKIVE — Fix Foreign Key Constraints for Magazine Deletion
-- Enables ON DELETE CASCADE so deleting a magazine cleans up payment obligations,
-- payment attempts, and manual UPI claims without foreign key violations.
-- ==============================================================================

-- 1. magazine_payments foreign key to magazines (ON DELETE CASCADE)
ALTER TABLE IF EXISTS public.magazine_payments
    DROP CONSTRAINT IF EXISTS magazine_payments_magazine_id_fkey,
    ADD CONSTRAINT magazine_payments_magazine_id_fkey
    FOREIGN KEY (magazine_id) REFERENCES public.magazines(id) ON DELETE CASCADE;

-- 2. payment_attempts foreign keys (ON DELETE CASCADE)
ALTER TABLE IF EXISTS public.payment_attempts
    DROP CONSTRAINT IF EXISTS payment_attempts_magazine_id_fkey,
    ADD CONSTRAINT payment_attempts_magazine_id_fkey
    FOREIGN KEY (magazine_id) REFERENCES public.magazines(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.payment_attempts
    DROP CONSTRAINT IF EXISTS payment_attempts_obligation_id_fkey,
    ADD CONSTRAINT payment_attempts_obligation_id_fkey
    FOREIGN KEY (obligation_id) REFERENCES public.magazine_payments(id) ON DELETE CASCADE;

-- 3. manual_upi_claims foreign keys (ON DELETE CASCADE)
ALTER TABLE IF EXISTS public.manual_upi_claims
    DROP CONSTRAINT IF EXISTS manual_upi_claims_magazine_id_fkey,
    ADD CONSTRAINT manual_upi_claims_magazine_id_fkey
    FOREIGN KEY (magazine_id) REFERENCES public.magazines(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.manual_upi_claims
    DROP CONSTRAINT IF EXISTS manual_upi_claims_obligation_id_fkey,
    ADD CONSTRAINT manual_upi_claims_obligation_id_fkey
    FOREIGN KEY (obligation_id) REFERENCES public.magazine_payments(id) ON DELETE CASCADE;

-- 4. payment_audit_logs foreign keys (ON DELETE SET NULL to preserve audit trail)
ALTER TABLE IF EXISTS public.payment_audit_logs
    DROP CONSTRAINT IF EXISTS payment_audit_logs_magazine_id_fkey,
    ADD CONSTRAINT payment_audit_logs_magazine_id_fkey
    FOREIGN KEY (magazine_id) REFERENCES public.magazines(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.payment_audit_logs
    DROP CONSTRAINT IF EXISTS payment_audit_logs_obligation_id_fkey,
    ADD CONSTRAINT payment_audit_logs_obligation_id_fkey
    FOREIGN KEY (obligation_id) REFERENCES public.magazine_payments(id) ON DELETE SET NULL;
