import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkQrPaymentStatus, simulateTestQrPayment } from '@/lib/payments/service';

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
    const { magazineId, qrId, simulateTest } = body;

    if (!magazineId || !qrId) {
      return NextResponse.json({ error: 'Missing magazineId or qrId in request body.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (simulateTest) {
      const simResult = await simulateTestQrPayment(supabase, { magazineId, qrId }, profile);
      if (!simResult.success) {
        return NextResponse.json({ error: simResult.error || 'Test simulation failed' }, { status: 400 });
      }
      return NextResponse.json({ success: true, paid: true, status: 'PAID' });
    }

    const result = await checkQrPaymentStatus(supabase, { magazineId, qrId }, profile);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to check QR status.' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in /api/payments/check-qr:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
