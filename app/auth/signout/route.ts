import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Error signing out:', err);
  }

  const requestUrl = new URL(request.url);
  return NextResponse.redirect(new URL('/admin/login', requestUrl.origin), {
    status: 302,
  });
}
