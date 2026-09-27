-- ======================================================================================
-- SUPABASE PG_CRON + PG_NET SAFETY NET SCHEDULER FOR THE RKIVE PDF WORKER
-- ======================================================================================
-- Description:
--   Native Supabase pg_cron safety-net scheduler for Vercel Hobby deployments.
--   Periodically checks if any PDF processing jobs are queued or stalled.
--   If pending work exists, retrieves the dedicated PDF worker secret from Supabase Vault
--   and dispatches an asynchronous HTTP POST to the Vercel Node.js worker route.
--
-- Security:
--   - No plaintext secrets stored in this migration.
--   - Secret is loaded dynamically from vault.decrypted_secrets (name = 'pdf_worker_secret').
--   - The HTTP call is skipped entirely when no jobs require processing.
-- ======================================================================================

-- 1. Enable required extensions in Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant schema permissions
GRANT USAGE ON SCHEMA cron TO postgres, service_role;
GRANT USAGE ON SCHEMA net TO postgres, service_role;

-- 2. Create the worker trigger function using Supabase Vault
CREATE OR REPLACE FUNCTION trigger_pdf_worker_cron(
  p_worker_url text DEFAULT 'https://the-rkive.vercel.app/api/worker/pdf-process'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net, vault
AS $$
DECLARE
  v_request_id bigint;
  v_has_pending_jobs boolean := false;
  v_secret text := NULL;
BEGIN
  -- Step 1: Check if any jobs are QUEUED or stalled in PROCESSING
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM pdf_processing_jobs
      WHERE (
        status = 'QUEUED'
        AND available_at <= NOW()
        AND attempts < max_attempts
      )
      OR (
        status = 'PROCESSING'
        AND locked_at < NOW() - INTERVAL '2 minutes'
        AND attempts < max_attempts
      )
    ) INTO v_has_pending_jobs;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM magazines
        WHERE processing_status IN ('QUEUED', 'PROCESSING')
      ) INTO v_has_pending_jobs;
    EXCEPTION WHEN OTHERS THEN
      v_has_pending_jobs := false;
    END;
  END;

  -- Step 2: If no work is pending, exit immediately without making an HTTP request
  IF v_has_pending_jobs IS NOT TRUE THEN
    RETURN 0;
  END IF;

  -- Step 3: Retrieve PDF_WORKER_SECRET from Supabase Vault
  BEGIN
    SELECT decrypted_secret
    INTO v_secret
    FROM vault.decrypted_secrets
    WHERE name = 'pdf_worker_secret'
    ORDER BY created_at DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

  -- If vault is not configured or secret is missing, do not dispatch unauthenticated calls
  IF v_secret IS NULL OR length(trim(v_secret)) = 0 THEN
    RAISE WARNING '[PDF_CRON] Cannot trigger worker: pdf_worker_secret is not configured in Supabase Vault.';
    RETURN 0;
  END IF;

  -- Step 4: Dispatch non-blocking HTTP POST via pg_net
  SELECT net.http_post(
    url := p_worker_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret,
      'x-worker-secret', v_secret
    ),
    body := jsonb_build_object(
      'source', 'supabase_pg_cron',
      'dispatched_at', EXTRACT(EPOCH FROM NOW())::text
    ),
    timeout_milliseconds := 5000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION trigger_pdf_worker_cron(text) TO postgres, service_role;

-- 3. Idempotently unschedule any previous job with the same name
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'invoke-pdf-worker') THEN
    PERFORM cron.unschedule('invoke-pdf-worker');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if cron schema is not accessible in local environment
END;
$$;

-- 4. Register the idempotent pg_cron schedule (* * * * *)
SELECT cron.schedule(
  'invoke-pdf-worker',
  '* * * * *',
  $$ SELECT trigger_pdf_worker_cron(); $$
);

-- ======================================================================================
-- SUPABASE VAULT SETUP INSTRUCTIONS (Run in Supabase SQL Editor once):
--
-- To store your worker secret in Supabase Vault:
--   SELECT vault.create_secret(
--     'your-chosen-secure-token-value',
--     'pdf_worker_secret',
--     'Dedicated server-to-server secret for PDF worker invocation'
--   );
-- ======================================================================================
