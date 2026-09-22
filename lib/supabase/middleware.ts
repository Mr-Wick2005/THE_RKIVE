import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from '@/types/database.types';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Graceful fallback if credentials are not configured yet
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder-project')) {
    return response;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Route Protection: Only check auth on admin routes (excluding setup and login)
  const isDashboardRoute =
    request.nextUrl.pathname.startsWith('/admin/dashboard') ||
    request.nextUrl.pathname.startsWith('/admin/magazines') ||
    request.nextUrl.pathname.startsWith('/admin/review') ||
    request.nextUrl.pathname.startsWith('/admin/users') ||
    request.nextUrl.pathname.startsWith('/admin/departments');
  const isLoginRoute = request.nextUrl.pathname === '/admin/login';
  const isSetupRoute = request.nextUrl.pathname === '/admin/setup';

  // For public routes, skip remote auth call entirely to ensure instant page load
  if (!isDashboardRoute && !isLoginRoute) {
    return response;
  }

  // Refresh auth token with a safety timeout (2.5s) so page loads never hang
  let user = null;
  try {
    const authPromise = supabase.auth.getUser();
    const timeoutPromise = new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), 2500)
    );
    const result = await Promise.race([authPromise, timeoutPromise]);
    user = result?.data?.user || null;
  } catch (authErr) {
    console.warn('[Middleware] Auth check timed out or failed:', authErr);
    user = null;
  }

  if (isDashboardRoute && !user) {
    const redirectUrl = new URL('/admin/login', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is already authenticated and visits /admin/login, redirect to /admin/dashboard
  if (isLoginRoute && user) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return response;
}
