import test from 'node:test';
import assert from 'node:assert/strict';

class ManualUpiEngine {
  constructor() {
    this.obligations = new Map();
    this.claims = new Map();
    this.auditLogs = [];
  }

  createObligation({ id, magazine_id, department_id, amount_paise = 2000 }) {
    const ob = {
      id,
      magazine_id,
      department_id,
      amount_paise,
      currency: 'INR',
      status: 'PENDING',
      payment_method: null,
      verified_at: null,
      verified_by: null,
    };
    this.obligations.set(magazine_id, ob);
    return ob;
  }

  submitClaim({ magazine_id, utr_reference, notes, actor }) {
    const ob = this.obligations.get(magazine_id);
    if (!ob) return { success: false, error: 'Obligation not found' };

    if (actor.role === 'DEPT_ADMIN' && actor.department_id !== ob.department_id) {
      return { success: false, error: 'Unauthorized: Cross-department claim submission prohibited' };
    }

    if (ob.status === 'PAID') {
      return { success: false, error: 'Magazine is already paid.' };
    }

    if (!utr_reference || utr_reference.trim().length < 6) {
      return { success: false, error: 'Invalid UTR reference: must be at least 6 characters.' };
    }

    // Check if an existing pending claim is already awaiting verification
    const existing = Array.from(this.claims.values()).find(
      (c) => c.magazine_id === magazine_id && c.status === 'PENDING'
    );
    if (existing) {
      return { success: false, error: 'A manual verification claim is already pending review for this publication.' };
    }

    const claim = {
      id: `claim_${Date.now()}`,
      payment_id: ob.id,
      magazine_id,
      utr_reference: utr_reference.trim(),
      amount_paise: ob.amount_paise,
      status: 'PENDING',
      submitted_by: actor.id,
      created_at: new Date().toISOString(),
      notes: notes || null,
    };

    this.claims.set(claim.id, claim);
    ob.status = 'MANUAL_VERIFICATION_PENDING';
    ob.payment_method = 'MANUAL_UPI';

    this.auditLogs.push({
      action: 'MANUAL_UPI_CLAIM_SUBMITTED',
      magazine_id,
      actor_id: actor.id,
      utr: claim.utr_reference,
    });

    return { success: true, claim };
  }

  resolveClaim({ claim_id, approved, rejection_reason, actor }) {
    if (actor.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Only Super Admin can verify manual UPI claims' };
    }

    const claim = this.claims.get(claim_id);
    if (!claim) return { success: false, error: 'Claim not found' };
    if (claim.status !== 'PENDING') {
      return { success: false, error: `Claim has already been resolved with status: ${claim.status}` };
    }

    const ob = this.obligations.get(claim.magazine_id);
    if (!ob) return { success: false, error: 'Associated payment obligation not found' };

    if (approved) {
      claim.status = 'VERIFIED';
      claim.verified_by = actor.id;
      claim.verified_at = new Date().toISOString();

      ob.status = 'PAID';
      ob.payment_method = 'MANUAL_UPI';
      ob.verified_by = actor.id;
      ob.verified_at = claim.verified_at;

      this.auditLogs.push({
        action: 'MANUAL_UPI_CLAIM_VERIFIED',
        claim_id,
        magazine_id: ob.magazine_id,
        verified_by: actor.id,
      });
    } else {
      if (!rejection_reason || !rejection_reason.trim()) {
        return { success: false, error: 'Rejection reason is mandatory when rejecting a claim' };
      }
      claim.status = 'REJECTED';
      claim.verified_by = actor.id;
      claim.rejection_reason = rejection_reason.trim();
      claim.verified_at = new Date().toISOString();

      // Obligation reverts to PENDING so user can retry or submit correct UTR
      ob.status = 'PENDING';

      this.auditLogs.push({
        action: 'MANUAL_UPI_CLAIM_REJECTED',
        claim_id,
        magazine_id: ob.magazine_id,
        reason: claim.rejection_reason,
      });
    }

    return { success: true, claim, obligation: ob };
  }
}

test('Manual UPI Claim Workflow', async (t) => {
  const engine = new ManualUpiEngine();
  const deptAdmin = { id: 'usr_dept_head', role: 'DEPT_ADMIN', department_id: 'dept_it' };
  const superAdmin = { id: 'usr_super_admin', role: 'SUPER_ADMIN' };

  const ob = engine.createObligation({
    id: 'obl_it_01',
    magazine_id: 'mag_it_2026',
    department_id: 'dept_it',
  });

  await t.test('submitting valid UTR places claim in PENDING state and marks obligation MANUAL_VERIFICATION_PENDING', () => {
    const res = engine.submitClaim({
      magazine_id: 'mag_it_2026',
      utr_reference: '412389123849',
      notes: 'Transferred via PhonePe from HDFC account',
      actor: deptAdmin,
    });
    assert.equal(res.success, true);
    assert.equal(res.claim.status, 'PENDING');
    assert.equal(ob.status, 'MANUAL_VERIFICATION_PENDING');
  });

  await t.test('Dept Admin cannot self-verify their own manual claim', () => {
    const claim = Array.from(engine.claims.values())[0];
    const res = engine.resolveClaim({
      claim_id: claim.id,
      approved: true,
      actor: deptAdmin, // Self-verification attempt
    });
    assert.equal(res.success, false);
    assert.match(res.error, /Only Super Admin can verify/);
    assert.equal(ob.status, 'MANUAL_VERIFICATION_PENDING', 'Obligation must not be marked PAID');
  });

  await t.test('Duplicate claim submission is blocked while one is pending', () => {
    const res = engine.submitClaim({
      magazine_id: 'mag_it_2026',
      utr_reference: '999999999999',
      actor: deptAdmin,
    });
    assert.equal(res.success, false);
    assert.match(res.error, /already pending review/);
  });

  await t.test('Super Admin rejects claim with required reason', () => {
    const claim = Array.from(engine.claims.values())[0];
    const failRes = engine.resolveClaim({
      claim_id: claim.id,
      approved: false,
      rejection_reason: '', // Missing reason
      actor: superAdmin,
    });
    assert.equal(failRes.success, false);
    assert.match(failRes.error, /Rejection reason is mandatory/);

    const rejRes = engine.resolveClaim({
      claim_id: claim.id,
      approved: false,
      rejection_reason: 'UTR 412389123849 not found in college SBI account statement',
      actor: superAdmin,
    });
    assert.equal(rejRes.success, true);
    assert.equal(claim.status, 'REJECTED');
    assert.equal(ob.status, 'PENDING');
  });

  await t.test('Dept Admin re-submits corrected UTR and Super Admin approves', () => {
    const resubRes = engine.submitClaim({
      magazine_id: 'mag_it_2026',
      utr_reference: '412389123850', // Corrected digit
      actor: deptAdmin,
    });
    assert.equal(resubRes.success, true);
    const newClaim = resubRes.claim;

    const aprRes = engine.resolveClaim({
      claim_id: newClaim.id,
      approved: true,
      actor: superAdmin,
    });
    assert.equal(aprRes.success, true);
    assert.equal(newClaim.status, 'VERIFIED');
    assert.equal(ob.status, 'PAID');
    assert.equal(ob.payment_method, 'MANUAL_UPI');
  });
});
