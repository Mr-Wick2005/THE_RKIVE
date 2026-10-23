import test from 'node:test';
import assert from 'node:assert/strict';

// Simulation of server-side gating logic in submitMagazineForReviewAction & publishMagazineAction
class MagazineEditorialEngine {
  constructor() {
    this.magazines = new Map();
    this.payments = new Map();
  }

  createMagazine({ id, title, department_id, status = 'DRAFT', processing_status = 'COMPLETED' }) {
    const mag = { id, title, department_id, status, processing_status };
    this.magazines.set(id, mag);
    return mag;
  }

  createPaymentObligation({ magazine_id, department_id, amount_paise = 2000 }) {
    const payment = {
      id: `pay_${magazine_id}`,
      magazine_id,
      department_id,
      amount_paise,
      currency: 'INR',
      status: 'PENDING',
    };
    this.payments.set(magazine_id, payment);
    return payment;
  }

  markPaymentPaid(magazine_id) {
    const p = this.payments.get(magazine_id);
    if (p) p.status = 'PAID';
  }

  // Corresponds to submitMagazineForReviewAction / resubmitMagazineAction
  submitForReview(magazine_id, actor) {
    const mag = this.magazines.get(magazine_id);
    if (!mag) return { success: false, error: 'Magazine not found' };

    // Ownership check
    if (actor.role === 'DEPT_ADMIN' && actor.department_id !== mag.department_id) {
      return { success: false, error: 'Unauthorized: Cross-department submission prohibited' };
    }

    // Eligibility check
    if (mag.processing_status !== 'COMPLETED') {
      return { success: false, error: 'PDF processing must complete before submission' };
    }

    // FINANCIAL GATING: Verified paid obligation required
    const payment = this.payments.get(magazine_id);
    if (!payment || payment.status !== 'PAID') {
      return {
        success: false,
        error: 'Payment requirement not satisfied. Submission fee of ₹20.00 must be verified before submitting.',
      };
    }

    if (!['DRAFT', 'REJECTED'].includes(mag.status)) {
      return { success: false, error: `Invalid status transition from ${mag.status}` };
    }

    mag.status = 'SUBMITTED';
    return { success: true, magazine: mag };
  }

  // Corresponds to publishMagazineAction
  publishMagazine(magazine_id, actor) {
    const mag = this.magazines.get(magazine_id);
    if (!mag) return { success: false, error: 'Magazine not found' };

    // Super Admin only
    if (actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Only Super Admin can publish magazines' };
    }

    if (mag.status !== 'APPROVED') {
      return { success: false, error: 'Only approved magazines can be published' };
    }

    // FINANCIAL GATING: Super Admin cannot publish an unverified/unpaid publication
    const payment = this.payments.get(magazine_id);
    if (!payment || payment.status !== 'PAID') {
      return { success: false, error: 'Financial requirement not satisfied: payment must be verified before publishing' };
    }

    mag.status = 'PUBLISHED';
    return { success: true, magazine: mag };
  }
}

test('Editorial Payment Gating: DRAFT to SUBMITTED', async (t) => {
  const engine = new MagazineEditorialEngine();
  const deptAdmin = { role: 'DEPT_ADMIN', department_id: 'dept_cs' };

  const mag = engine.createMagazine({
    id: 'mag_001',
    title: 'Computer Science Digest 2026',
    department_id: 'dept_cs',
  });
  engine.createPaymentObligation({ magazine_id: 'mag_001', department_id: 'dept_cs' });

  await t.test('blocks submission when payment is pending', () => {
    const res = engine.submitForReview('mag_001', deptAdmin);
    assert.equal(res.success, false);
    assert.match(res.error, /Payment requirement not satisfied/);
    assert.equal(mag.status, 'DRAFT', 'Status must remain DRAFT');
  });

  await t.test('permits submission once payment is verified and PAID', () => {
    engine.markPaymentPaid('mag_001');
    const res = engine.submitForReview('mag_001', deptAdmin);
    assert.equal(res.success, true);
    assert.equal(mag.status, 'SUBMITTED');
  });
});

test('Corrections & Resubmission Rule: Rejected magazine retains paid entitlement', async (t) => {
  const engine = new MagazineEditorialEngine();
  const deptAdmin = { role: 'DEPT_ADMIN', department_id: 'dept_ece' };
  const superAdmin = { role: 'SUPER_ADMIN' };

  // 1. Department ECE creates Magazine M1 and pays ₹20
  const m1 = engine.createMagazine({
    id: 'mag_ece_2026',
    title: 'ECE Waves 2026',
    department_id: 'dept_ece',
  });
  engine.createPaymentObligation({ magazine_id: 'mag_ece_2026', department_id: 'dept_ece' });
  engine.markPaymentPaid('mag_ece_2026');

  // 2. Submit M1 for review
  const subRes = engine.submitForReview('mag_ece_2026', deptAdmin);
  assert.equal(subRes.success, true);
  assert.equal(m1.status, 'SUBMITTED');

  // 3. Super Admin reviews and rejects M1 with revision notes
  m1.status = 'REJECTED';
  m1.rejection_reason = 'Cover image resolution too low. Please re-upload.';

  // 4. Department fixes the PDF/cover on the same magazine record (same magazine_id)
  // Resubmit without re-paying
  await t.test('resubmitting corrected rejected magazine does NOT require second payment', () => {
    const resubmitRes = engine.submitForReview('mag_ece_2026', deptAdmin);
    assert.equal(resubmitRes.success, true);
    assert.equal(m1.status, 'SUBMITTED');
  });

  // 5. Verify entitlement cannot be stolen/transferred to a different magazine M2
  await t.test('creating a brand new magazine M2 cannot reuse M1 paid entitlement', () => {
    const m2 = engine.createMagazine({
      id: 'mag_ece_new',
      title: 'ECE New Unauthorized Issue',
      department_id: 'dept_ece',
    });
    // Dept admin attempts to submit M2 without creating/paying its own obligation
    const resM2 = engine.submitForReview('mag_ece_new', deptAdmin);
    assert.equal(resM2.success, false);
    assert.match(resM2.error, /Payment requirement not satisfied/);
    assert.equal(m2.status, 'DRAFT');
  });
});

test('Publishing Gating Rule: Super Admin cannot publish unverified magazine', async (t) => {
  const engine = new MagazineEditorialEngine();
  const superAdmin = { role: 'SUPER_ADMIN' };

  const mag = engine.createMagazine({
    id: 'mag_bypass_attempt',
    title: 'Unpaid Magazine Direct Publish Attempt',
    department_id: 'dept_mech',
    status: 'APPROVED',
  });
  // Payment is never marked paid
  engine.createPaymentObligation({ magazine_id: 'mag_bypass_attempt', department_id: 'dept_mech' });

  const pubRes = engine.publishMagazine('mag_bypass_attempt', superAdmin);
  assert.equal(pubRes.success, false);
  assert.match(pubRes.error, /Financial requirement not satisfied/);
  assert.equal(mag.status, 'APPROVED', 'Status must not transition to PUBLISHED');

  // Now verify payment
  engine.markPaymentPaid('mag_bypass_attempt');
  const pubSuccessRes = engine.publishMagazine('mag_bypass_attempt', superAdmin);
  assert.equal(pubSuccessRes.success, true);
  assert.equal(mag.status, 'PUBLISHED');
});
