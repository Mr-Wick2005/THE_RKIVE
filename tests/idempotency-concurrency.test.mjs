import test from 'node:test';
import assert from 'node:assert/strict';

class PaymentIdempotencyEngine {
  constructor() {
    this.obligations = new Map();
    this.paymentAttempts = new Map(); // Keyed by provider_payment_id
  }

  createObligation({ id, magazine_id, department_id, amount_paise = 2000 }) {
    const ob = {
      id,
      magazine_id,
      department_id,
      amount_paise,
      currency: 'INR',
      status: 'PENDING',
      provider_order_id: null,
      provider_payment_id: null,
      order_created_at: null,
    };
    this.obligations.set(magazine_id, ob);
    return ob;
  }

  // Corresponds to createOrGetPaymentOrder
  createOrGetOrder(magazine_id) {
    const ob = this.obligations.get(magazine_id);
    if (!ob) return { success: false, error: 'Obligation not found' };

    // Idempotency check: if order already exists and is less than 30 mins old, reuse it
    if (ob.provider_order_id && ob.order_created_at) {
      const ageMinutes = (Date.now() - ob.order_created_at) / (1000 * 60);
      if (ageMinutes < 30) {
        return {
          success: true,
          reused: true,
          orderId: ob.provider_order_id,
        };
      }
    }

    // Otherwise generate a new order
    ob.provider_order_id = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    ob.order_created_at = Date.now();
    return {
      success: true,
      reused: false,
      orderId: ob.provider_order_id,
    };
  }

  // Corresponds to verifyAndConfirmPayment
  verifyAndConfirm({ magazine_id, orderId, paymentId }) {
    const ob = this.obligations.get(magazine_id);
    if (!ob) return { success: false, error: 'Obligation not found' };

    // Idempotency: if already paid with same paymentId, return success immediately
    if (ob.status === 'PAID' && ob.provider_payment_id === paymentId) {
      return { success: true, idempotent: true, message: 'Payment already verified and confirmed' };
    }

    // CROSS-MAGAZINE THEFT PROTECTION:
    // Ensure provider_payment_id has not been credited to ANY other obligation
    if (this.paymentAttempts.has(paymentId)) {
      const existingOwner = this.paymentAttempts.get(paymentId);
      if (existingOwner !== magazine_id) {
        return {
          success: false,
          error: `Payment ${paymentId} has already been credited to a different publication (${existingOwner}). Duplicate credit rejected.`,
        };
      }
    }

    // Register payment
    this.paymentAttempts.set(paymentId, magazine_id);
    ob.status = 'PAID';
    ob.provider_payment_id = paymentId;
    ob.provider_order_id = orderId;
    return { success: true, idempotent: false };
  }
}

test('Payment Order Idempotency & Concurrency', async (t) => {
  const engine = new PaymentIdempotencyEngine();
  engine.createObligation({ id: 'obl_001', magazine_id: 'mag_001', department_id: 'dept_01' });

  await t.test('first order creation generates a new Razorpay order ID', () => {
    const res = engine.createOrGetOrder('mag_001');
    assert.equal(res.success, true);
    assert.equal(res.reused, false);
    assert.ok(res.orderId.startsWith('order_'));
  });

  await t.test('rapid second click / concurrent tab reuses the active order without creating duplicate orders', () => {
    const res = engine.createOrGetOrder('mag_001');
    assert.equal(res.success, true);
    assert.equal(res.reused, true);
  });
});

test('Payment Verification Idempotency & Cross-Magazine Fraud Prevention', async (t) => {
  const engine = new PaymentIdempotencyEngine();
  engine.createObligation({ id: 'obl_alpha', magazine_id: 'mag_alpha', department_id: 'dept_01' });
  engine.createObligation({ id: 'obl_beta', magazine_id: 'mag_beta', department_id: 'dept_02' });

  const orderAlpha = engine.createOrGetOrder('mag_alpha').orderId;
  const payId = 'pay_shared_bank_txn_777';

  await t.test('verifying payment for Magazine Alpha succeeds and marks PAID', () => {
    const res = engine.verifyAndConfirm({
      magazine_id: 'mag_alpha',
      orderId: orderAlpha,
      paymentId: payId,
    });
    assert.equal(res.success, true);
    assert.equal(res.idempotent, false);
  });

  await t.test('repeated verification call for Magazine Alpha (browser refresh or retry) returns idempotent success', () => {
    const res = engine.verifyAndConfirm({
      magazine_id: 'mag_alpha',
      orderId: orderAlpha,
      paymentId: payId,
    });
    assert.equal(res.success, true);
    assert.equal(res.idempotent, true);
    assert.match(res.message, /already verified/);
  });

  await t.test('attempting to use the SAME payment ID to credit Magazine Beta is strictly blocked', () => {
    const orderBeta = engine.createOrGetOrder('mag_beta').orderId;
    const res = engine.verifyAndConfirm({
      magazine_id: 'mag_beta',
      orderId: orderBeta,
      paymentId: payId, // Attempted reuse of same Razorpay payment
    });
    assert.equal(res.success, false);
    assert.match(res.error, /credited to a different publication/);
    const obBeta = engine.obligations.get('mag_beta');
    assert.equal(obBeta.status, 'PENDING', 'Magazine Beta must remain unpaid');
  });
});
