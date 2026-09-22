import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/admin/dashboard';

  if (code) {
    try {
      const supabase = createClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.error('Error exchanging auth code:', err);
      return NextResponse.redirect(
        new URL(`/admin/login?error=auth_callback_failed`, requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
