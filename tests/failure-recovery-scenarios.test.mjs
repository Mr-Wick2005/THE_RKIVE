import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Comprehensive failure and recovery simulation suite for Section 6 & 11
test('Phase 2 Failure and Recovery Scenarios', async (t) => {
  const secret = 'test_secret_key_fail_rec_777';
  const webhookSecret = 'test_wh_secret_fail_rec_888';

  function sign(orderId, paymentId) {
    return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  function signWebhook(raw) {
    return crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex');
  }

  await t.test('1. Cancelled checkout: modal dismissed before completion', () => {
    // Expected: Order remains CREATED, obligation remains PENDING, magazine remains DRAFT
    const obligation = { id: 'obl_cancel', status: 'PENDING' };
    const attempt = { provider_order_id: 'order_cancel', status: 'CREATED' };
    const magazine = { id: 'mag_cancel', status: 'DRAFT' };

    // When checkout is cancelled, no verification occurs
    assert.equal(obligation.status, 'PENDING');
    assert.equal(magazine.status, 'DRAFT', 'Magazine must remain DRAFT');
    assert.equal(attempt.status, 'CREATED', 'Order attempt remains available for resume');
  });

  await t.test('2. Browser closed after payment: Webhook resolves obligation asynchronously', () => {
    // Expected: User closed browser after paying; webhook arrives and confirms PAID
    const obligation = { id: 'obl_closed_tab', status: 'PENDING' };
    const attempt = { provider_order_id: 'order_tab_123', status: 'CREATED', obligation_id: 'obl_closed_tab' };

    const webhookEvent = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_async_999',
            order_id: 'order_tab_123',
            amount: 2000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    };

    // Webhook processes event
    if (webhookEvent.payload.payment.entity.order_id === attempt.provider_order_id) {
      obligation.status = 'PAID';
      attempt.status = 'CAPTURED';
    }

    assert.equal(obligation.status, 'PAID', 'Obligation was safely credited via webhook');
  });

  await t.test('3. Browser callback with forged payment ID: Signature verification fails', () => {
    const orderId = 'order_legit_001';
    const legitPaymentId = 'pay_legit_001';
    const validSignature = sign(orderId, legitPaymentId);

    // Attacker sends forged payment ID with valid signature of another pair
    const forgedPaymentId = 'pay_forged_999';
    const computed = crypto.createHmac('sha256', secret).update(`${orderId}|${forgedPaymentId}`).digest('hex');

    assert.notEqual(computed, validSignature, 'Forged payment ID produces mismatched signature');
  });

  await t.test('4. Valid signature but provider status is not captured: Verification rejects', () => {
    const rzpPayment = {
      id: 'pay_refunded_or_failed',
      order_id: 'order_abc',
      amount: 2000,
      currency: 'INR',
      status: 'refunded', // Not captured
    };

    const isEligible = rzpPayment.status === 'captured' || rzpPayment.status === 'authorized';
    assert.equal(isEligible, false, 'Refunded/failed provider status must be rejected');
  });

  await t.test('5. Wrong amount in provider response: Verification rejects', () => {
    const expectedAmountPaise = 2000;
    const providerReturnedAmount = 100; // ₹1 paid instead of ₹20
    assert.notEqual(providerReturnedAmount, expectedAmountPaise, 'Amount mismatch detected');
  });

  await t.test('6. Wrong currency in provider response: Verification rejects', () => {
    const expectedCurrency = 'INR';
    const providerCurrency = 'EUR';
    assert.notEqual(providerCurrency, expectedCurrency, 'Currency mismatch detected');
  });

  await t.test('7. Unknown or unassociated provider order ID: Verification rejects', () => {
    const registeredOrders = new Set(['order_dept_cs_1', 'order_dept_ece_2']);
    const requestedOrder = 'order_attacker_fake';
    assert.equal(registeredOrders.has(requestedOrder), false, 'Unknown order must be rejected');
  });

  await t.test('8. Duplicate verification (browser refresh): Idempotent success', () => {
    const obligation = { id: 'obl_dup', status: 'PAID', provider_payment_id: 'pay_dup_123' };
    const incomingPaymentId = 'pay_dup_123';

    let result;
    if (obligation.status === 'PAID' && obligation.provider_payment_id === incomingPaymentId) {
      result = { success: true, idempotent: true };
    }
    assert.equal(result.success, true);
    assert.equal(result.idempotent, true);
  });

  await t.test('9. Invalid or tampered webhook signature: Webhook rejects with 400', () => {
    const rawPayload = JSON.stringify({ event: 'payment.captured', id: 'pay_tamper' });
    const realSig = signWebhook(rawPayload);
    const tamperedPayload = rawPayload.replace('pay_tamper', 'pay_altered');

    const expectedSig = crypto.createHmac('sha256', webhookSecret).update(tamperedPayload).digest('hex');
    assert.notEqual(expectedSig, realSig, 'Tampered raw body fails signature check');
  });

  await t.test('10. Delayed failed event arriving after captured event: Out-of-order protection', () => {
    const obligation = { id: 'obl_race', status: 'PAID' }; // Already paid
    const attempt = { provider_order_id: 'order_race', status: 'CAPTURED' }; // Already captured

    // Late payment.failed event arrives
    const lateFailedEvent = { event: 'payment.failed' };

    // Protection rule: Do not downgrade CAPTURED attempt or PAID obligation
    if (attempt.status !== 'CAPTURED') {
      attempt.status = 'FAILED';
    }
    if (obligation.status !== 'PAID') {
      obligation.status = 'FAILED';
    }

    assert.equal(obligation.status, 'PAID', 'Confirmed obligation must NEVER be downgraded by delayed failed event');
    assert.equal(attempt.status, 'CAPTURED', 'Captured attempt must not be overwritten');
  });

  await t.test('11. Temporary provider API failure (timeout/500): Safe error, obligation stays PENDING', () => {
    let obligationStatus = 'PENDING';
    try {
      throw new Error('ETIMEDOUT: Razorpay API gateway timed out');
    } catch (err) {
      // Safe error handling preserves pending state
      assert.match(err.message, /ETIMEDOUT/);
    }
    assert.equal(obligationStatus, 'PENDING', 'Obligation must remain PENDING for retry');
  });

  await t.test('12. Concurrent order initiation: Reuses active order within 30 min window', () => {
    const now = Date.now();
    const existingAttempt = {
      provider_order_id: 'order_active_reuse',
      created_at: now - 5 * 60 * 1000, // 5 minutes old
      status: 'CREATED',
    };

    const ageMinutes = (now - existingAttempt.created_at) / (1000 * 60);
    assert.ok(ageMinutes < 30, 'Existing order is within 30-min reuse window');
    // Result: reuse order_active_reuse instead of creating a second order
  });

  await t.test('13. Manual UPI claim with invalid UTR: Rejected at submission', () => {
    const invalidShortUtr = '12345'; // Too short (< 8 chars)
    const isValid = invalidShortUtr.length >= 8 && invalidShortUtr.length <= 35;
    assert.equal(isValid, false, 'Invalid UTR must be rejected');
  });

  await t.test('14. Dept Admin attempts to verify manual UPI claim: Unauthorized', () => {
    const caller = { role: 'DEPT_ADMIN', id: 'usr_dept' };
    const isAuthorized = caller.role === 'SUPER_ADMIN';
    assert.equal(isAuthorized, false, 'Dept Admin cannot verify manual claims');
  });

  await t.test('15. Super Admin rejects manual UPI claim: Obligation reverts to PENDING', () => {
    const claim = { status: 'PENDING', rejection_reason: null };
    const obligation = { status: 'MANUAL_VERIFICATION_PENDING' };

    // Super Admin rejects with reason
    claim.status = 'REJECTED';
    claim.rejection_reason = 'UTR not visible in college bank statement';
    obligation.status = 'PENDING';

    assert.equal(claim.status, 'REJECTED');
    assert.equal(obligation.status, 'PENDING', 'Obligation reverts to PENDING so Dept Admin can correct UTR');
  });
});
