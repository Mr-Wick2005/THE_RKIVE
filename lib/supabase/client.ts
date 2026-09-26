import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

declare global {
  // eslint-disable-next-line no-var
  var __supabaseBrowserClient: SupabaseClient<Database> | undefined;
}

let browserClient: SupabaseClient<Database> | null = null;

export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-key';

  // In SSR / server context, return a stateless client without persistent storage
  if (typeof window === 'undefined') {
    return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  // In browser context, reuse a single shared GoTrueClient / SupabaseClient instance
  if (!globalThis.__supabaseBrowserClient) {
    globalThis.__supabaseBrowserClient = createSupabaseClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          storage: window.sessionStorage,
          storageKey: 'sb-admin-auth-token',
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      }
    );
  }

  browserClient = globalThis.__supabaseBrowserClient;
  return browserClient;
}

