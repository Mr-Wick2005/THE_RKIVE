import crypto from 'crypto';
import Razorpay from 'razorpay';

/**
 * Returns a server-side Razorpay client instance using environment variables.
 * Never instantiate this in client components or browser contexts.
 */
export function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret || keyId.includes('placeholder') || keySecret.includes('placeholder') || keyId.includes('REPLACE')) {
    throw new Error('Razorpay server credentials are not configured in environment variables. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Checks whether the configured Razorpay credentials are in Test Mode (sandbox).
 */
export function isRazorpayTestMode(): boolean {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();
  return keyId.startsWith('rzp_test_');
}

/**
 * Returns the public Razorpay Key ID safe for browser checkout modal initialization.
 */
export function getPublicRazorpayKeyId(): string | null {
  const keyId = (
    process.env.RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    ''
  ).trim();

  if (!keyId || keyId.includes('REPLACE')) return null;
  return keyId;
}

/**
 * Creates an official single-use, fixed-amount Dynamic UPI QR code via Razorpay QR Code API.
 * The generated image URL renders a legitimate, banking-compliant dynamic QR code.
 */
export async function createRazorpayQrCode(params: {
  amountPaise: number;
  name?: string;
  description?: string;
  closeByMinutes?: number;
  notes?: Record<string, string | number>;
}): Promise<{
  id: string;
  imageUrl: string;
  closeBy: number;
  status: string;
  amountPaise: number;
}> {
  const razorpay = getRazorpayClient();
  const closeByMinutes = params.closeByMinutes || 30; // default 30 min (must be >= 15 min per Razorpay API)
  const closeByUnix = Math.floor(Date.now() / 1000) + Math.max(16, closeByMinutes) * 60;

  const qr = await razorpay.qrCode.create({
    type: 'upi_qr',
    name: params.name || 'The Rkive Editorial Submission',
    usage: 'single_use',
    fixed_amount: true,
    payment_amount: params.amountPaise,
    description: (params.description || 'Editorial Submission Fee').slice(0, 40),
    close_by: closeByUnix,
    notes: (params.notes && Object.keys(params.notes).length > 0 ? params.notes : { purpose: 'submission_fee' }) as any,
  });

  if (!qr || !qr.id || !qr.image_url) {
    throw new Error('Razorpay QR Code API response did not include a valid QR ID or image URL.');
  }

  return {
    id: qr.id,
    imageUrl: qr.image_url,
    closeBy: qr.close_by || closeByUnix,
    status: qr.status || 'active',
    amountPaise: qr.payment_amount || params.amountPaise,
  };
}

/**
 * Fetches all captured payments associated with a specific Razorpay QR code.
 */
export async function fetchRazorpayQrPayments(qrId: string) {
  const razorpay = getRazorpayClient();
  return await razorpay.qrCode.fetchAllPayments(qrId);
}

/**
 * Fetches a Razorpay QR code entity to inspect status, payments_amount_received, etc.
 */
export async function fetchRazorpayQrCode(qrId: string) {
  const razorpay = getRazorpayClient();
  return await razorpay.qrCode.fetch(qrId);
}

/**
 * Closes an active Razorpay QR code when expired or cancelled.
 */
export async function closeRazorpayQrCode(qrId: string) {
  try {
    const razorpay = getRazorpayClient();
    return await razorpay.qrCode.close(qrId);
  } catch (err) {
    console.warn('[Razorpay QR] Failed to close QR code:', qrId, err);
    return null;
  }
}

/**
 * Verifies the Razorpay payment signature returned by the client checkout modal.
 * Uses HMAC-SHA256(order_id + "|" + payment_id, secret) with constant-time equality check.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secretOverride?: string;
}): boolean {
  const { orderId, paymentId, signature, secretOverride } = params;
  const secret = secretOverride || process.env.RAZORPAY_KEY_SECRET;

  if (!secret || !orderId || !paymentId || !signature) {
    return false;
  }

  try {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    console.error('[Payment Crypto] Error verifying payment signature:', err);
    return false;
  }
}

/**
 * Verifies incoming Razorpay webhook signature against the raw unparsed request body.
 * Uses HMAC-SHA256(rawBody, webhookSecret) with constant-time equality check.
 */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string;
  secretOverride?: string;
}): boolean {
  const { rawBody, signature, secretOverride } = params;
  const secret = secretOverride || process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !rawBody || !signature) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (err) {
    console.error('[Payment Crypto] Error verifying webhook signature:', err);
    return false;
  }
}
