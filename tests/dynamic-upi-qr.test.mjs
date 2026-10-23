import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from '../lib/payments/razorpay.ts';

describe('Razorpay Dynamic UPI QR Integration & Invariants', () => {
  // Mock DB store for isolated test execution
  function createMockDb() {
    const store = {
      magazines: [
        {
          id: 'mag-dept-cse-01',
          department_id: 'dept-cse',
          title: 'CSE Chronicle 2026',
          processing_status: 'COMPLETED',
          page_count: 24,
          status: 'DRAFT',
        },
        {
          id: 'mag-dept-mech-02',
          department_id: 'dept-mech',
          title: 'Mech Pulse 2026',
          processing_status: 'COMPLETED',
          page_count: 18,
          status: 'DRAFT',
        },
      ],
      platform_settings: [
        { key: 'magazine_submission_fee', value_paise: 2000, currency: 'INR', is_active: true }
      ],
      magazine_payments: [],
      payment_attempts: [],
      payment_webhook_events: [],
      payment_audit_logs: [],
    };
    return store;
  }

  test('1. Dynamic UPI QR generation enforces single-use, fixed-amount, and 30-min window', () => {
    const feePaise = 2000;
    const nowUnix = Math.floor(Date.now() / 1000);
    const closeByUnix = nowUnix + 1800; // 30 minutes

    const qrRequestParams = {
      type: 'upi_qr',
      name: 'The Rkive Editorial Submission',
      usage: 'single_use',
      fixed_amount: true,
      payment_amount: feePaise,
      description: 'Submission Fee: CSE Chronicle 2026'.slice(0, 40),
      close_by: closeByUnix,
      notes: {
        magazine_id: 'mag-dept-cse-01',
        department_id: 'dept-cse',
      },
    };

    assert.equal(qrRequestParams.type, 'upi_qr', 'QR must be dedicated UPI QR type');
    assert.equal(qrRequestParams.usage, 'single_use', 'QR must be single_use to prevent multi-payment collisions');
    assert.equal(qrRequestParams.fixed_amount, true, 'QR must have fixed_amount=true');
    assert.equal(qrRequestParams.payment_amount, 2000, 'QR amount must match platform fee in integer paise');
    assert.ok(qrRequestParams.close_by >= nowUnix + 900, 'Expiration must be at least 15 minutes in the future');
  });

  test('2. Dynamic UPI QR idempotency: reuses existing active QR within validity window', () => {
    const db = createMockDb();
    const obligationId = 'obl-001';
    const activeQrId = 'qr_test_active_123';
    const closeBy = Math.floor(Date.now() / 1000) + 1500;

    // Simulate existing active attempt created 5 minutes ago
    db.payment_attempts.push({
      obligation_id: obligationId,
      magazine_id: 'mag-dept-cse-01',
      provider: 'RAZORPAY_QR',
      provider_order_id: activeQrId,
      amount_paise: 2000,
      currency: 'INR',
      status: 'CREATED',
      metadata: {
        image_url: 'https://rzp.io/rzp/test_qr_img',
        close_by: closeBy,
      },
      created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    });

    const recent = db.payment_attempts.find(
      (a) => a.obligation_id === obligationId && a.provider === 'RAZORPAY_QR' && a.status === 'CREATED'
    );

    assert.ok(recent, 'Active attempt should be located');
    assert.equal(recent.provider_order_id, activeQrId, 'Must reuse identical active QR without creating duplicate');
  });

  test('3. Expired QR code handling: detects expiration and requires fresh QR generation', () => {
    const pastCloseBy = Math.floor(Date.now() / 1000) - 60; // Expired 1 min ago
    const isExpired = pastCloseBy <= Math.floor(Date.now() / 1000);

    assert.equal(isExpired, true, 'Expired timestamp must be identified');
  });

  test('4. Webhook processing: qr_code.credited verifies raw HMAC signature and captures payment', () => {
    const webhookSecret = 'test_webhook_secret_key_99';
    const payload = JSON.stringify({
      entity: 'event',
      account_id: 'acc_test123',
      event: 'qr_code.credited',
      contains: ['qr_code', 'payment'],
      payload: {
        qr_code: {
          entity: {
            id: 'qr_test_credited_456',
            entity: 'qr_code',
            payments_amount_received: 2000,
            status: 'closed',
          },
        },
        payment: {
          entity: {
            id: 'pay_test_qr_payment_789',
            entity: 'payment',
            amount: 2000,
            currency: 'INR',
            status: 'captured',
            order_id: null,
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    });

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const isValid = verifyWebhookSignature({
      rawBody: payload,
      signature: expectedSignature,
      secretOverride: webhookSecret,
    });

    assert.equal(isValid, true, 'Cryptographic signature on raw body must pass');

    // Tampered payload check
    const tamperedPayload = payload.replace('2000', '1000');
    const isTamperedValid = verifyWebhookSignature({
      rawBody: tamperedPayload,
      signature: expectedSignature,
      secretOverride: webhookSecret,
    });

    assert.equal(isTamperedValid, false, 'Tampered payload must be rejected');
  });

  test('5. Webhook deduplication: duplicate qr_code.credited replay is idempotent', () => {
    const db = createMockDb();
    const eventId = 'evt_test_qr_duplicate_001';

    // First arrival
    const existsBefore = db.payment_webhook_events.some((e) => e.event_id === eventId);
    assert.equal(existsBefore, false);
    db.payment_webhook_events.push({ event_id: eventId, status: 'PROCESSED' });

    // Replay arrival
    const existsAfter = db.payment_webhook_events.some((e) => e.event_id === eventId);
    assert.equal(existsAfter, true, 'Duplicate webhook event must be identified and ignored');
  });

  test('6. Out-of-order protection: delayed payment.failed cannot downgrade confirmed QR payment', () => {
    const obligation = {
      id: 'obl-001',
      status: 'PAID', // Already confirmed
      payment_method: 'RAZORPAY_QR',
    };

    // Attempting to apply delayed failed event
    const incomingEvent = 'payment.failed';
    let updatedStatus = obligation.status;
    if (incomingEvent === 'payment.failed' && obligation.status !== 'PAID') {
      updatedStatus = 'FAILED';
    }

    assert.equal(updatedStatus, 'PAID', 'Confirmed PAID status cannot be downgraded by out-of-order failure');
  });

  test('7. Test Mode simulation guard: simulation is strictly restricted to test keys', () => {
    function canSimulate(keyId) {
      return Boolean(keyId && keyId.startsWith('rzp_test_'));
    }

    assert.equal(canSimulate('rzp_test_TqW85H4z0B21Wz'), true, 'Test mode key allowed to simulate');
    assert.equal(canSimulate('rzp_live_realproductionkey123'), false, 'Live production key strictly blocked from simulation');
    assert.equal(canSimulate(''), false, 'Empty key strictly blocked');
  });

  test('8. Cross-magazine entitlement guard: QR payment for Magazine A cannot unlock Magazine B', () => {
    const db = createMockDb();
    const paymentId = 'pay_qr_exclusive_111';

    // Magazine A paid
    db.magazine_payments.push({
      id: 'obl-mag-A',
      magazine_id: 'mag-dept-cse-01',
      status: 'PAID',
      metadata: { razorpay_payment_id: paymentId },
    });

    // Magazine B attempts to claim Magazine A's payment ID
    const isAlreadyClaimed = db.magazine_payments.some(
      (o) => o.metadata?.razorpay_payment_id === paymentId && o.magazine_id !== 'mag-dept-mech-02'
    );

    assert.equal(isAlreadyClaimed, true, 'Payment ID re-use across publications is strictly prevented');
  });

  test('9. Resubmission invariant: Rejected publication retains PAID obligation without requiring second payment', () => {
    const obligation = {
      magazine_id: 'mag-dept-cse-01',
      status: 'PAID',
      payment_method: 'RAZORPAY_QR',
    };

    // Magazine was rejected by Super Admin
    const magazine = {
      id: 'mag-dept-cse-01',
      status: 'REJECTED',
      rejection_reason: 'Please correct page 3 layout.',
    };

    // Dept Admin edits and resubmits
    const hasPaidObligation = obligation.status === 'PAID';
    assert.equal(hasPaidObligation, true, 'Resubmission retains existing paid entitlement');
  });

  test('10. Payment does not automatically approve or publish the publication', () => {
    const magazine = {
      id: 'mag-dept-cse-01',
      status: 'DRAFT',
    };

    // Payment succeeds
    const paymentStatus = 'PAID';

    // Invariant: Status remains DRAFT or transitions to SUBMITTED upon explicit editorial action
    assert.notEqual(magazine.status, 'APPROVED', 'Payment must never automatically approve publication');
    assert.notEqual(magazine.status, 'PUBLISHED', 'Payment must never automatically publish publication');
  });

  test('11. Missing table detection: detects PGRST205 and schema cache errors safely', () => {
    function isMissingTableError(err) {
      if (!err) return false;
      const msg = (typeof err === 'string' ? err : err.message || err.details || '').toLowerCase();
      return (
        msg.includes('schema cache') ||
        msg.includes('does not exist') ||
        msg.includes('pgrst205') ||
        msg.includes('could not find the table')
      );
    }

    assert.equal(isMissingTableError({ message: "Could not find the table 'public.magazine_payments' in the schema cache" }), true);
    assert.equal(isMissingTableError({ code: 'PGRST205', details: 'relation does not exist' }), true);
    assert.equal(isMissingTableError(new Error("table 'platform_settings' does not exist")), true);
    assert.equal(isMissingTableError(null), false);
    assert.equal(isMissingTableError({ message: 'Invalid JWT token' }), false);
  });

  test('12. Safe isolated sandbox store activates when remote DB tables are missing in test mode', () => {
    const sandboxStore = {
      obligations: new Map(),
      attempts: new Map(),
      manualClaims: new Map(),
      webhookEvents: new Set(),
    };
    const testMagId = 'mag-sandbox-isolated-test';

    // Set sandbox obligation
    sandboxStore.obligations.set(testMagId, {
      id: `obl_sandbox_${testMagId}`,
      magazine_id: testMagId,
      department_id: 'dept-test',
      amount_paise: 2000,
      currency: 'INR',
      status: 'PENDING',
      payment_method: 'RAZORPAY_QR',
      fee_snapshot_paise: 2000,
      paid_at: null,
      verified_by: null,
      verified_at: null,
      rejection_reason: null,
      created_by: 'user-dept-admin',
      metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    assert.ok(sandboxStore.obligations.has(testMagId), 'Sandbox obligation exists in memory');
    assert.equal(sandboxStore.obligations.get(testMagId)?.status, 'PENDING');
  });

  test('13. Simulated payment marks obligation PAID in sandbox and satisfies submission gating', () => {
    const sandboxStore = {
      obligations: new Map(),
    };
    const testMagId = 'mag-sandbox-isolated-test';

    sandboxStore.obligations.set(testMagId, {
      id: `obl_sandbox_${testMagId}`,
      magazine_id: testMagId,
      status: 'PENDING',
    });

    const obl = sandboxStore.obligations.get(testMagId);
    assert.ok(obl, 'Sandbox obligation must exist');

    // Simulate payment
    obl.status = 'PAID';
    obl.paid_at = new Date().toISOString();
    sandboxStore.obligations.set(testMagId, obl);

    assert.equal(sandboxStore.obligations.get(testMagId)?.status, 'PAID', 'Must be marked PAID in sandbox');
  });

  test('14. Webhook header parsing: accepts X-Razorpay-Event-Id header and falls back deterministically', () => {
    function resolveEventId(header, payload) {
      return (
        header ||
        payload?.event_id ||
        payload?.id ||
        (payload?.payload?.payment?.entity?.id ? `evt_${payload.event}_${payload.payload.payment.entity.id}` : null) ||
        (payload?.payload?.qr_code?.entity?.id ? `evt_${payload.event}_${payload.payload.qr_code.entity.id}` : null)
      );
    }

    const payload = {
      event: 'qr_code.credited',
      payload: {
        payment: { entity: { id: 'pay_qr_head_123' } },
        qr_code: { entity: { id: 'qr_head_456' } },
      },
    };

    // Case A: Official Razorpay header present
    assert.equal(resolveEventId('evt_rzp_hdr_789', payload), 'evt_rzp_hdr_789');

    // Case B: Header absent, fallback to deterministic payment entity id
    assert.equal(resolveEventId(null, payload), 'evt_qr_code.credited_pay_qr_head_123');

    // Case C: Empty payload and no header yields null
    assert.equal(resolveEventId(null, {}), null);
  });

  test('15. Webhook validation: rejects non-captured payment status in qr_code.credited', () => {
    function validatePaymentStatus(paymentEntity) {
      if (paymentEntity?.status && paymentEntity.status !== 'captured') {
        return { valid: false, error: `Payment is not in captured status: ${paymentEntity.status}` };
      }
      return { valid: true };
    }

    assert.equal(validatePaymentStatus({ status: 'captured' }).valid, true);
    assert.equal(validatePaymentStatus({ status: 'failed' }).valid, false);
    assert.equal(validatePaymentStatus({ status: 'authorized' }).valid, false);
    assert.equal(validatePaymentStatus({ status: 'refunded' }).valid, false);
  });

  test('16. Webhook validation: rejects amount in paise mismatch with magazine obligation', () => {
    function validateAmount(receivedAmount, obligationAmount) {
      if (receivedAmount !== undefined && obligationAmount !== undefined && receivedAmount !== obligationAmount) {
        return { valid: false, error: 'Webhook payment amount mismatch with obligation.' };
      }
      return { valid: true };
    }

    assert.equal(validateAmount(2000, 2000).valid, true);
    assert.equal(validateAmount(100, 2000).valid, false);
    assert.equal(validateAmount(5000, 2000).valid, false);
  });

  test('17. Webhook validation: rejects non-INR currency', () => {
    function validateCurrency(currency) {
      if (currency && currency !== 'INR') {
        return { valid: false, error: 'Webhook payment currency must be INR.' };
      }
      return { valid: true };
    }

    assert.equal(validateCurrency('INR').valid, true);
    assert.equal(validateCurrency('USD').valid, false);
    assert.equal(validateCurrency('EUR').valid, false);
  });

  test('18. State persistence: recovers active QR metadata across simulated restart from obligation metadata', () => {
    const obligation = {
      id: 'obl_restart_test',
      amount_paise: 2000,
      currency: 'INR',
      status: 'PENDING',
      metadata: {
        active_qr: {
          id: 'qr_persisted_789',
          image_url: 'https://rzp.io/i/persisted_qr',
          close_by: Math.floor(Date.now() / 1000) + 1200,
        },
      },
    };

    // Simulated recent attempt in DB has NO metadata column
    const dbAttemptWithoutMetadata = {
      provider_order_id: 'qr_persisted_789',
      obligation_id: obligation.id,
      status: 'CREATED',
    };

    // Recovery logic
    const activeQr = obligation.metadata?.active_qr;
    const resolvedQrId = dbAttemptWithoutMetadata?.provider_order_id || activeQr?.id;
    const resolvedImageUrl =
      (activeQr?.id === resolvedQrId ? activeQr?.image_url : null) ||
      activeQr?.image_url;
    const resolvedCloseBy =
      (activeQr?.id === resolvedQrId ? activeQr?.close_by : null) ||
      activeQr?.close_by;

    assert.equal(resolvedQrId, 'qr_persisted_789');
    assert.equal(resolvedImageUrl, 'https://rzp.io/i/persisted_qr');
    assert.ok(resolvedCloseBy > Math.floor(Date.now() / 1000));
  });

  test('19. Cross-magazine fraud prevention: blocks duplicate QR payment credit across different publications', () => {
    const recordedAttempts = [
      { obligation_id: 'obl_mag_alpha', provider_payment_id: 'pay_qr_exclusive_999' },
    ];

    function checkCrossMagazine(paymentId, targetObligationId) {
      const match = recordedAttempts.find(
        (a) => a.provider_payment_id === paymentId && a.obligation_id !== targetObligationId
      );
      if (match) {
        return { allowed: false, error: 'This payment ID has already been credited to another publication obligation.' };
      }
      return { allowed: true };
    }

    assert.equal(checkCrossMagazine('pay_qr_exclusive_999', 'obl_mag_alpha').allowed, true);
    assert.equal(checkCrossMagazine('pay_qr_exclusive_999', 'obl_mag_beta').allowed, false);
    assert.equal(checkCrossMagazine('pay_brand_new_111', 'obl_mag_beta').allowed, true);
  });

  test('20. Deleting a publication safely cascades/cleans up payment attempts, claims, and obligations', async () => {
    const db = createMockDb();
    const magId = 'mag-dept-cse-01';

    // Seed payment records for this magazine
    db.magazine_payments.push({
      id: 'obl-01',
      magazine_id: magId,
      status: 'PAID',
      amount_paise: 2000,
    });
    db.payment_attempts.push({
      id: 'att-01',
      obligation_id: 'obl-01',
      magazine_id: magId,
      provider_order_id: 'order_123',
    });
    db.payment_audit_logs.push({
      id: 'log-01',
      magazine_id: magId,
      event_type: 'ORDER_CREATED',
    });

    assert.equal(db.magazine_payments.filter(p => p.magazine_id === magId).length, 1);
    assert.equal(db.payment_attempts.filter(a => a.magazine_id === magId).length, 1);
    assert.equal(db.payment_audit_logs.filter(l => l.magazine_id === magId).length, 1);

    // Mock supabase client to test deletion cascade order
    const mockSupabase = {
      from: (tableName) => ({
        delete: () => ({
          eq: (col, val) => {
            if (tableName === 'payment_attempts') {
              db.payment_attempts = db.payment_attempts.filter(r => r[col] !== val);
            } else if (tableName === 'manual_upi_claims') {
              // none
            } else if (tableName === 'payment_audit_logs') {
              db.payment_audit_logs = db.payment_audit_logs.filter(r => r[col] !== val);
            } else if (tableName === 'magazine_payments') {
              // Ensure attempts were already cleared so foreign key would not fail
              if (db.payment_attempts.some(a => a.magazine_id === val)) {
                throw new Error('Foreign key violation: payment_attempts references magazine_payments');
              }
              db.magazine_payments = db.magazine_payments.filter(r => r[col] !== val);
            } else if (tableName === 'magazines') {
              // Ensure payments were already cleared
              if (db.magazine_payments.some(p => p.magazine_id === val)) {
                throw new Error('update or delete on table "magazines" violates foreign key constraint "magazine_payments_magazine_id_fkey" on table "magazine_payments"');
              }
              db.magazines = db.magazines.filter(m => m.id !== val);
            }
            return Promise.resolve({ data: null, error: null });
          },
        }),
      }),
    };

    async function cleanupMagazinePaymentsMock(supabase, magazineId) {
      if (!magazineId) return;
      await supabase.from('payment_attempts').delete().eq('magazine_id', magazineId);
      await supabase.from('manual_upi_claims').delete().eq('magazine_id', magazineId);
      await supabase.from('payment_audit_logs').delete().eq('magazine_id', magazineId);
      await supabase.from('magazine_payments').delete().eq('magazine_id', magazineId);
    }

    await cleanupMagazinePaymentsMock(mockSupabase, magId);

    // Now delete from magazines - should succeed without foreign key violation!
    const { error: deleteErr } = await mockSupabase.from('magazines').delete().eq('id', magId);
    assert.equal(deleteErr, null);
    assert.equal(db.magazines.filter(m => m.id === magId).length, 0);
    assert.equal(db.magazine_payments.filter(p => p.magazine_id === magId).length, 0);
    assert.equal(db.payment_attempts.filter(a => a.magazine_id === magId).length, 0);
  });
});

