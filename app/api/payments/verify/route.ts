import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAndConfirmPayment } from '@/lib/payments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return NextResponse.json({ error: 'Unauthorized: Active profile required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { magazineId, orderId, paymentId, signature } = body;

    if (!magazineId || !orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Missing required payment verification fields.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const result = await verifyAndConfirmPayment(
      supabase,
      {
        magazineId,
        orderId,
        paymentId,
        signature,
      },
      profile
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Payment verification failed.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in /api/payments/verify:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
