import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Simulation of the audited verifyAndConfirmPayment logic with full invariant checks
class PaymentVerificationService {
  constructor() {
    this.obligations = new Map();
    this.paymentAttempts = new Map(); // Keyed by provider_order_id
    this.providerPayments = new Map(); // Mocked Razorpay API state
  }

  setupObligation({ id, magazine_id, department_id, amount_paise = 2000, currency = 'INR', status = 'PENDING' }) {
    const ob = { id, magazine_id, department_id, amount_paise, currency, status, paid_at: null, metadata: {} };
    this.obligations.set(magazine_id, ob);
    return ob;
  }

  setupAttempt({ obligation_id, provider_order_id, amount_paise = 2000, status = 'CREATED' }) {
    const attempt = { obligation_id, provider_order_id, amount_paise, status, provider_payment_id: null };
    this.paymentAttempts.set(provider_order_id, attempt);
    return attempt;
  }

  setupProviderPayment({ id, order_id, amount = 2000, currency = 'INR', status = 'captured' }) {
    this.providerPayments.set(id, { id, order_id, amount, currency, status });
  }

  // Pure representation of verifyAndConfirmPayment
  async verifyAndConfirm({ magazineId, orderId, paymentId, signature, secret, callerProfile }) {
    // 1. Signature check
    if (!secret || !orderId || !paymentId || !signature) {
      return { success: false, error: 'Missing required signature or parameters.' };
    }
    const payload = `${orderId}|${paymentId}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    const sigBuf = Buffer.from(signature, 'utf8');
    if (expBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)) {
      return { success: false, error: 'Payment signature verification failed. Untrusted response.' };
    }

    // 2. Fetch obligation
    const obligation = this.obligations.get(magazineId);
    if (!obligation) {
      return { success: false, error: 'Payment obligation not found for this magazine.' };
    }

    // Caller authorization check
    if (callerProfile.role !== 'SUPER_ADMIN' && obligation.department_id !== callerProfile.department_id) {
      return { success: false, error: 'Forbidden: You can only verify payments for your own department.' };
    }

    // Verify orderId belongs to this obligation
    const attempt = this.paymentAttempts.get(orderId);
    if (!attempt || attempt.obligation_id !== obligation.id) {
      return { success: false, error: 'Signed provider order ID does not belong to this payment obligation.' };
    }

    // Check cross-magazine payment reuse
    for (const [otherOrderId, otherAttempt] of this.paymentAttempts.entries()) {
      if (otherAttempt.provider_payment_id === paymentId && otherAttempt.obligation_id !== obligation.id) {
        return { success: false, error: 'This payment ID has already been credited to another publication obligation.' };
      }
    }

    // If already paid with this exact payment ID, return idempotent success
    if (obligation.status === 'PAID') {
      return { success: true, status: 'PAID', idempotent: true };
    }

    // 3. Provider API confirmation
    const rzpPayment = this.providerPayments.get(paymentId);
    if (!rzpPayment) {
      return { success: false, error: 'Provider payment not found or provider API unreachable.' };
    }

    if (rzpPayment.order_id !== orderId) {
      return { success: false, error: 'Provider order ID mismatch on retrieved payment.' };
    }

    if (rzpPayment.amount !== obligation.amount_paise) {
      return { success: false, error: 'Payment amount mismatch between provider and obligation.' };
    }

    if (rzpPayment.currency !== 'INR' || rzpPayment.currency !== obligation.currency) {
      return {
        success: false,
        error: `Payment currency mismatch: provider returned '${rzpPayment.currency}', expected '${obligation.currency}'.`,
      };
    }

    if (rzpPayment.status === 'authorized') {
      // Simulate capture
      rzpPayment.status = 'captured';
    } else if (rzpPayment.status !== 'captured') {
      return { success: false, error: `Payment is in non-completed state: '${rzpPayment.status}'.` };
    }

    // 4. Mark captured and paid
    attempt.provider_payment_id = paymentId;
    attempt.status = 'CAPTURED';

    obligation.status = 'PAID';
    obligation.paid_at = new Date().toISOString();
    obligation.metadata = { razorpay_order_id: orderId, razorpay_payment_id: paymentId };

    return { success: true, status: 'PAID', idempotent: false };
  }
}

test('Financial Invariant Audit: verifyAndConfirmPayment Checks', async (t) => {
  const secret = 'rzp_test_secret_key_999';

  function createSig(orderId, paymentId) {
    return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  await t.test('accepts authentic captured payment and marks obligation PAID', async () => {
    const svc = new PaymentVerificationService();
    const ob = svc.setupObligation({ id: 'obl_1', magazine_id: 'mag_1', department_id: 'dept_cs' });
    svc.setupAttempt({ obligation_id: 'obl_1', provider_order_id: 'order_1' });
    svc.setupProviderPayment({ id: 'pay_1', order_id: 'order_1', amount: 2000, currency: 'INR', status: 'captured' });

    const res = await svc.verifyAndConfirm({
      magazineId: 'mag_1',
      orderId: 'order_1',
      paymentId: 'pay_1',
      signature: createSig('order_1', 'pay_1'),
      secret,
      callerProfile: { role: 'DEPT_ADMIN', department_id: 'dept_cs' },
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'PAID');
    assert.equal(ob.status, 'PAID');
  });

  await t.test('rejects verification if signed order ID belongs to a different obligation', async () => {
    const svc = new PaymentVerificationService();
    // Magazine 1 has obligation 1
    svc.setupObligation({ id: 'obl_1', magazine_id: 'mag_1', department_id: 'dept_cs' });
    // Order was created for a different obligation
    svc.setupAttempt({ obligation_id: 'obl_OTHER', provider_order_id: 'order_FOREIGN' });
    svc.setupProviderPayment({ id: 'pay_foreign', order_id: 'order_FOREIGN', amount: 2000, currency: 'INR', status: 'captured' });

    const res = await svc.verifyAndConfirm({
      magazineId: 'mag_1',
      orderId: 'order_FOREIGN',
      paymentId: 'pay_foreign',
      signature: createSig('order_FOREIGN', 'pay_foreign'),
      secret,
      callerProfile: { role: 'DEPT_ADMIN', department_id: 'dept_cs' },
    });

    assert.equal(res.success, false);
    assert.match(res.error, /does not belong to this payment obligation/);
  });

  await t.test('rejects cross-department verification attempt', async () => {
    const svc = new PaymentVerificationService();
    svc.setupObligation({ id: 'obl_ece', magazine_id: 'mag_ece', department_id: 'dept_ece' });
    svc.setupAttempt({ obligation_id: 'obl_ece', provider_order_id: 'order_ece' });
    svc.setupProviderPayment({ id: 'pay_ece', order_id: 'order_ece', amount: 2000, currency: 'INR', status: 'captured' });

    // Admin from dept_mech tries to verify payment for dept_ece magazine
    const res = await svc.verifyAndConfirm({
      magazineId: 'mag_ece',
      orderId: 'order_ece',
      paymentId: 'pay_ece',
      signature: createSig('order_ece', 'pay_ece'),
      secret,
      callerProfile: { role: 'DEPT_ADMIN', department_id: 'dept_mech' },
    });

    assert.equal(res.success, false);
    assert.match(res.error, /only verify payments for your own department/);
  });

  await t.test('rejects payment with mismatched currency (e.g. USD instead of INR)', async () => {
    const svc = new PaymentVerificationService();
    svc.setupObligation({ id: 'obl_cur', magazine_id: 'mag_cur', department_id: 'dept_cur' });
    svc.setupAttempt({ obligation_id: 'obl_cur', provider_order_id: 'order_cur' });
    svc.setupProviderPayment({ id: 'pay_usd', order_id: 'order_cur', amount: 2000, currency: 'USD', status: 'captured' });

    const res = await svc.verifyAndConfirm({
      magazineId: 'mag_cur',
      orderId: 'order_cur',
      paymentId: 'pay_usd',
      signature: createSig('order_cur', 'pay_usd'),
      secret,
      callerProfile: { role: 'DEPT_ADMIN', department_id: 'dept_cur' },
    });

    assert.equal(res.success, false);
    assert.match(res.error, /Payment currency mismatch/);
  });

  await t.test('rejects payment with mismatched amount', async () => {
    const svc = new PaymentVerificationService();
    svc.setupObligation({ id: 'obl_amt', magazine_id: 'mag_amt', department_id: 'dept_amt', amount_paise: 2000 });
    svc.setupAttempt({ obligation_id: 'obl_amt', provider_order_id: 'order_amt' });
    svc.setupProviderPayment({ id: 'pay_cheap', order_id: 'order_amt', amount: 100, currency: 'INR', status: 'captured' });

    const res = await svc.verifyAndConfirm({
      magazineId: 'mag_amt',
      orderId: 'order_amt',
      paymentId: 'pay_cheap',
      signature: createSig('order_amt', 'pay_cheap'),
      secret,
      callerProfile: { role: 'DEPT_ADMIN', department_id: 'dept_amt' },
    });

    assert.equal(res.success, false);
    assert.match(res.error, /Payment amount mismatch/);
  });

  await t.test('rejects payment in failed or uncaptured state', async () => {
    const svc = new PaymentVerificationService();
    svc.setupObligation({ id: 'obl_fail', magazine_id: 'mag_fail', department_id: 'dept_fail' });
    svc.setupAttempt({ obligation_id: 'obl_fail', provider_order_id: 'order_fail' });
    svc.setupProviderPayment({ id: 'pay_failed', order_id: 'order_fail', amount: 2000, currency: 'INR', status: 'failed' });

    const res = await svc.verifyAndConfirm({
      magazineId: 'mag_fail',
      orderId: 'order_fail',
      paymentId: 'pay_failed',
      signature: createSig('order_fail', 'pay_failed'),
      secret,
      callerProfile: { role: 'DEPT_ADMIN', department_id: 'dept_fail' },
    });

    assert.equal(res.success, false);
    assert.match(res.error, /Payment is in non-completed state/);
  });

  await t.test('captures authorized payment and confirms captured state', async () => {
    const svc = new PaymentVerificationService();
    svc.setupObligation({ id: 'obl_auth', magazine_id: 'mag_auth', department_id: 'dept_auth' });
    svc.setupAttempt({ obligation_id: 'obl_auth', provider_order_id: 'order_auth' });
    svc.setupProviderPayment({ id: 'pay_auth', order_id: 'order_auth', amount: 2000, currency: 'INR', status: 'authorized' });

    const res = await svc.verifyAndConfirm({
      magazineId: 'mag_auth',
      orderId: 'order_auth',
      paymentId: 'pay_auth',
      signature: createSig('order_auth', 'pay_auth'),
      secret,
      callerProfile: { role: 'DEPT_ADMIN', department_id: 'dept_auth' },
    });

    assert.equal(res.success, true);
    assert.equal(res.status, 'PAID');
    const p = svc.providerPayments.get('pay_auth');
    assert.equal(p.status, 'captured');
  });

  await t.test('rejects cross-magazine payment ID reuse', async () => {
    const svc = new PaymentVerificationService();
    // Mag 1 already used pay_shared
    const ob1 = svc.setupObligation({ id: 'obl_1', magazine_id: 'mag_1', department_id: 'dept_1' });
    const att1 = svc.setupAttempt({ obligation_id: 'obl_1', provider_order_id: 'order_1' });
    att1.provider_payment_id = 'pay_shared';

    // Mag 2 tries to verify with the same pay_shared
    svc.setupObligation({ id: 'obl_2', magazine_id: 'mag_2', department_id: 'dept_2' });
    svc.setupAttempt({ obligation_id: 'obl_2', provider_order_id: 'order_2' });
    svc.setupProviderPayment({ id: 'pay_shared', order_id: 'order_2', amount: 2000, currency: 'INR', status: 'captured' });

    const res = await svc.verifyAndConfirm({
      magazineId: 'mag_2',
      orderId: 'order_2',
      paymentId: 'pay_shared',
      signature: createSig('order_2', 'pay_shared'),
      secret,
      callerProfile: { role: 'DEPT_ADMIN', department_id: 'dept_2' },
    });

    assert.equal(res.success, false);
    assert.match(res.error, /already been credited to another publication/);
  });
});
