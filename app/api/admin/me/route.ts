import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();
    // Exactly ONE server-side JWT verification
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // Query active profile and joined department in a single database round-trip
    const { data: profileWithDept, error: profileError } = await (supabaseAdmin
      .from('profiles') as any)
      .select('*, department:departments(*)')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (profileError || !profileWithDept) {
      return NextResponse.json(
        { error: 'Profile not found or deactivated' },
        { status: 403 }
      );
    }

    const department = profileWithDept.department || null;
    const { department: _dept, ...profile } = profileWithDept;

    return NextResponse.json({ user, profile, department });
  } catch (err: any) {
    console.error('Error in /api/admin/me:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
