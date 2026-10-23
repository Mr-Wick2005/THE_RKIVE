import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRazorpayWebhook } from '@/lib/payments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-razorpay-signature');
    const eventId = request.headers.get('x-razorpay-event-id');
    const rawBody = await request.text();

    if (!rawBody || !signature) {
      return NextResponse.json({ error: 'Missing body or signature' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const result = await handleRazorpayWebhook(supabase, rawBody, signature, eventId);

    if (!result.success) {
      console.warn('[Webhook] Signature or processing failed:', result.error);
      return NextResponse.json({ error: result.error || 'Webhook verification failed' }, { status: 400 });
    }

    return NextResponse.json({ received: true, duplicate: Boolean(result.duplicate) });
  } catch (err: any) {
    console.error('[Webhook] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
