import test from 'node:test';
import assert from 'node:assert/strict';

class WebhookLedgerEngine {
  constructor() {
    this.webhookEvents = new Map(); // Keyed by provider_event_id
    this.obligations = new Map();
    this.auditLogs = [];
  }

  createObligation({ id, magazine_id, amount_paise = 2000 }) {
    const ob = { id, magazine_id, amount_paise, status: 'PENDING', provider_payment_id: null };
    this.obligations.set(id, ob);
    return ob;
  }

  processWebhookEvent({ eventId, eventType, orderId, paymentId, amount, currency, status }) {
    // 1. Durable Deduplication Check
    if (this.webhookEvents.has(eventId)) {
      const existing = this.webhookEvents.get(eventId);
      return {
        success: true,
        duplicate: true,
        message: `Event ${eventId} has already been recorded and processed with status ${existing.status}`,
      };
    }

    // 2. Ledger Registration
    const eventRecord = {
      provider_event_id: eventId,
      event_type: eventType,
      status: 'PROCESSING',
      received_at: new Date().toISOString(),
    };
    this.webhookEvents.set(eventId, eventRecord);

    const ob = this.obligations.get(orderId);
    if (!ob) {
      eventRecord.status = 'ORPHANED_ORDER';
      return { success: false, error: 'Order not found' };
    }

    // 3. Amount & Currency Validation
    if (amount !== ob.amount_paise || currency !== 'INR') {
      eventRecord.status = 'AMOUNT_CURRENCY_MISMATCH';
      return { success: false, error: 'Amount or currency mismatch' };
    }

    // 4. Handle Event Transitions with Out-of-order Protection
    if (eventType === 'payment.captured') {
      ob.status = 'PAID';
      ob.provider_payment_id = paymentId;
      eventRecord.status = 'PROCESSED';
      this.auditLogs.push({ action: 'PAYMENT_CAPTURED_WEBHOOK', eventId, paymentId });
    } else if (eventType === 'payment.failed') {
      // OUT-OF-ORDER PROTECTION: Never downgrade a confirmed PAID obligation!
      if (ob.status === 'PAID') {
        eventRecord.status = 'IGNORED_OUT_OF_ORDER';
        this.auditLogs.push({
          action: 'FAILED_EVENT_IGNORED_FOR_PAID_OBLIGATION',
          eventId,
          paymentId,
        });
      } else {
        ob.status = 'FAILED';
        eventRecord.status = 'PROCESSED';
      }
    } else {
      eventRecord.status = 'IGNORED_UNHANDLED_TYPE';
    }

    return { success: true, duplicate: false, obligation: ob };
  }
}

test('Webhook Deduplication & Out-of-order Resilience', async (t) => {
  const engine = new WebhookLedgerEngine();
  const ob = engine.createObligation({ id: 'order_test_123', magazine_id: 'mag_123', amount_paise: 2000 });

  await t.test('first payment.captured webhook marks obligation PAID and records in ledger', () => {
    const res = engine.processWebhookEvent({
      eventId: 'evt_cap_001',
      eventType: 'payment.captured',
      orderId: 'order_test_123',
      paymentId: 'pay_9990001',
      amount: 2000,
      currency: 'INR',
      status: 'captured',
    });
    assert.equal(res.success, true);
    assert.equal(res.duplicate, false);
    assert.equal(ob.status, 'PAID');
    assert.equal(ob.provider_payment_id, 'pay_9990001');
  });

  await t.test('duplicate webhook with same eventId is acknowledged idempotently without double processing', () => {
    const res = engine.processWebhookEvent({
      eventId: 'evt_cap_001', // Exact same event ID
      eventType: 'payment.captured',
      orderId: 'order_test_123',
      paymentId: 'pay_9990001',
      amount: 2000,
      currency: 'INR',
      status: 'captured',
    });
    assert.equal(res.success, true);
    assert.equal(res.duplicate, true);
    assert.match(res.message, /already been recorded/);
    assert.equal(ob.status, 'PAID');
  });

  await t.test('out-of-order delayed payment.failed event cannot downgrade confirmed PAID obligation', () => {
    const res = engine.processWebhookEvent({
      eventId: 'evt_fail_late_002',
      eventType: 'payment.failed',
      orderId: 'order_test_123',
      paymentId: 'pay_older_failed_attempt',
      amount: 2000,
      currency: 'INR',
      status: 'failed',
    });
    assert.equal(res.success, true);
    assert.equal(ob.status, 'PAID', 'Obligation status must remain PAID despite late failed event');
    const eventRecord = engine.webhookEvents.get('evt_fail_late_002');
    assert.equal(eventRecord.status, 'IGNORED_OUT_OF_ORDER');
  });
});
