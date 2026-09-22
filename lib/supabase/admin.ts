import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

/**
 * Creates a privileged Supabase client using a server-only secret key for
 * server-side background processing pipelines (e.g. PDF page extraction).
 * `SUPABASE_SECRET_KEY` supports the current `sb_secret_` key format; the
 * legacy `SUPABASE_SERVICE_ROLE_KEY` remains supported for service-role JWTs.
 * This client must never fall back to a browser publishable key.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isPublishableKey = serviceRoleKey?.startsWith('sb_publishable_');
  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    supabaseUrl.includes('placeholder') ||
    serviceRoleKey.includes('placeholder') ||
    isPublishableKey
  ) {
    throw new Error('Server Supabase admin credentials are not configured.');
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
