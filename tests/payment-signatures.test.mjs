import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Replicating verifyPaymentSignature logic for pure testing
function verifyPaymentSignature({ orderId, paymentId, signature, secret }) {
  if (!secret || !orderId || !paymentId || !signature) return false;
  try {
    const payload = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const expBuf = Buffer.from(expected, 'utf8');
    const sigBuf = Buffer.from(signature, 'utf8');
    if (expBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch {
    return false;
  }
}

function verifyWebhookSignature({ rawBody, signature, secret }) {
  if (!secret || !rawBody || !signature) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const expBuf = Buffer.from(expected, 'utf8');
    const sigBuf = Buffer.from(signature, 'utf8');
    if (expBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch {
    return false;
  }
}

test('Razorpay Standard Checkout Signature Verification', async (t) => {
  const secret = 'test_secret_key_abc123';
  const orderId = 'order_DA1234567890';
  const paymentId = 'pay_XY9876543210';
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  await t.test('accepts valid HMAC-SHA256 signature', () => {
    const isValid = verifyPaymentSignature({
      orderId,
      paymentId,
      signature: validSignature,
      secret,
    });
    assert.equal(isValid, true, 'Valid signature must be verified successfully');
  });

  await t.test('rejects tampered payment ID', () => {
    const isValid = verifyPaymentSignature({
      orderId,
      paymentId: 'pay_FORGED1234567',
      signature: validSignature,
      secret,
    });
    assert.equal(isValid, false, 'Tampered payment ID must be rejected');
  });

  await t.test('rejects tampered order ID', () => {
    const isValid = verifyPaymentSignature({
      orderId: 'order_DIFFERENT999',
      paymentId,
      signature: validSignature,
      secret,
    });
    assert.equal(isValid, false, 'Tampered order ID must be rejected');
  });

  await t.test('rejects wrong secret', () => {
    const isValid = verifyPaymentSignature({
      orderId,
      paymentId,
      signature: validSignature,
      secret: 'wrong_secret_attacker',
    });
    assert.equal(isValid, false, 'Wrong secret must fail verification');
  });

  await t.test('rejects truncated or malformed signature', () => {
    const isValid = verifyPaymentSignature({
      orderId,
      paymentId,
      signature: validSignature.slice(0, 10),
      secret,
    });
    assert.equal(isValid, false, 'Malformed signature length must fail verification safely');
  });

  await t.test('rejects missing or empty inputs safely', () => {
    assert.equal(verifyPaymentSignature({ orderId: '', paymentId, signature: validSignature, secret }), false);
    assert.equal(verifyPaymentSignature({ orderId, paymentId: '', signature: validSignature, secret }), false);
    assert.equal(verifyPaymentSignature({ orderId, paymentId, signature: '', secret }), false);
    assert.equal(verifyPaymentSignature({ orderId, paymentId, signature: validSignature, secret: '' }), false);
  });
});

test('Razorpay Webhook Signature Verification', async (t) => {
  const webhookSecret = 'test_webhook_secret_xyz789';
  const rawBody = JSON.stringify({
    entity: 'event',
    account_id: 'acc_123',
    event: 'payment.captured',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: 'pay_999888777',
          order_id: 'order_111222333',
          amount: 2000,
          currency: 'INR',
          status: 'captured',
        },
      },
    },
    created_at: 1729384000,
  });

  const validSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  await t.test('accepts valid webhook signature with exact raw body', () => {
    const isValid = verifyWebhookSignature({
      rawBody,
      signature: validSignature,
      secret: webhookSecret,
    });
    assert.equal(isValid, true, 'Valid webhook payload and signature must pass');
  });

  await t.test('rejects tampered webhook body', () => {
    const tamperedBody = rawBody.replace('2000', '50000');
    const isValid = verifyWebhookSignature({
      rawBody: tamperedBody,
      signature: validSignature,
      secret: webhookSecret,
    });
    assert.equal(isValid, false, 'Tampered webhook body must fail signature check');
  });

  await t.test('rejects modified whitespace or formatting (raw body integrity)', () => {
    const formattedBody = JSON.stringify(JSON.parse(rawBody), null, 2);
    const isValid = verifyWebhookSignature({
      rawBody: formattedBody,
      signature: validSignature,
      secret: webhookSecret,
    });
    assert.equal(isValid, false, 'Formatted/re-serialized body without exact bytes must fail');
  });

  await t.test('rejects incorrect webhook secret', () => {
    const isValid = verifyWebhookSignature({
      rawBody,
      signature: validSignature,
      secret: 'attacker_fake_secret',
    });
    assert.equal(isValid, false, 'Wrong webhook secret must be rejected');
  });
});
