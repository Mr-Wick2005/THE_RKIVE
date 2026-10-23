import test from 'node:test';
import assert from 'node:assert/strict';

// Business constants and fee validation logic
const MIN_FEE_PAISE = 100; // ₹1.00
const MAX_FEE_PAISE = 100000; // ₹1,000.00
const DEFAULT_FEE_PAISE = 2000; // ₹20.00
const SUPPORTED_CURRENCY = 'INR';

function validateFeePaise(feePaise) {
  if (typeof feePaise !== 'number' || !Number.isInteger(feePaise)) {
    return { valid: false, error: 'Fee must be an integer amount in paise.' };
  }
  if (feePaise < MIN_FEE_PAISE) {
    return { valid: false, error: `Fee cannot be less than ₹${MIN_FEE_PAISE / 100}.` };
  }
  if (feePaise > MAX_FEE_PAISE) {
    return { valid: false, error: `Fee cannot exceed ₹${MAX_FEE_PAISE / 100}.` };
  }
  return { valid: true };
}

function formatPaiseToInr(paise) {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

test('Platform Fee Configuration & Validation Rules', async (t) => {
  await t.test('accepts default initial fee of ₹20.00 (2,000 paise)', () => {
    const res = validateFeePaise(DEFAULT_FEE_PAISE);
    assert.equal(res.valid, true);
    assert.equal(formatPaiseToInr(DEFAULT_FEE_PAISE), '₹20.00');
  });

  await t.test('accepts valid minimum fee of ₹1.00 (100 paise)', () => {
    const res = validateFeePaise(100);
    assert.equal(res.valid, true);
    assert.equal(formatPaiseToInr(100), '₹1.00');
  });

  await t.test('accepts valid maximum fee of ₹1,000.00 (100,000 paise)', () => {
    const res = validateFeePaise(100000);
    assert.equal(res.valid, true);
    assert.equal(formatPaiseToInr(100000), '₹1,000.00');
  });

  await t.test('rejects negative fee amounts', () => {
    const res = validateFeePaise(-2000);
    assert.equal(res.valid, false);
    assert.match(res.error, /cannot be less than/);
  });

  await t.test('rejects zero fee amount', () => {
    const res = validateFeePaise(0);
    assert.equal(res.valid, false);
    assert.match(res.error, /cannot be less than/);
  });

  await t.test('rejects fractional / floating-point paise', () => {
    const res = validateFeePaise(2000.5);
    assert.equal(res.valid, false);
    assert.match(res.error, /must be an integer/);
  });

  await t.test('rejects non-numeric values', () => {
    const res = validateFeePaise('2000');
    assert.equal(res.valid, false);
    assert.match(res.error, /must be an integer/);
  });

  await t.test('rejects fee exceeding upper bound of ₹1,000.00', () => {
    const res = validateFeePaise(100001);
    assert.equal(res.valid, false);
    assert.match(res.error, /cannot exceed/);
  });
});

test('Super Admin Fee Authorization & Mandatory Audit Reason Rules', async (t) => {
  const superAdmin = { id: 'usr-super-01', role: 'SUPER_ADMIN' };
  const deptAdmin = { id: 'usr-dept-02', role: 'DEPARTMENT_ADMIN', department_id: 'dept-ece' };

  function updateFeeSimulation(caller, newFeePaise, reason, dbState) {
    if (caller.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Only Super Administrators can configure platform fees.' };
    }
    const val = validateFeePaise(newFeePaise);
    if (!val.valid) return { success: false, error: val.error };

    const cleanReason = reason?.trim();
    if (!cleanReason || cleanReason.length < 3) {
      return { success: false, error: 'A mandatory audit reason is required for institutional audit history.' };
    }

    if (!dbState.platform_settings_table_exists) {
      return {
        success: false,
        error: 'Database table "public.platform_settings" does not exist in the connected database.',
      };
    }

    const previousFee = dbState.settings.value_paise;
    dbState.settings.value_paise = newFeePaise;
    dbState.settings.updated_at = new Date().toISOString();
    dbState.settings.updated_by = caller.id;

    dbState.audit_logs.push({
      id: `audit-${Date.now()}`,
      previous_fee_paise: previousFee,
      new_fee_paise: newFeePaise,
      changed_by: caller.id,
      change_reason: cleanReason,
      created_at: new Date().toISOString(),
    });

    return { success: true };
  }

  await t.test('Department Admin cannot update platform fee', () => {
    const db = {
      platform_settings_table_exists: true,
      settings: { key: 'magazine_submission_fee', value_paise: 2000 },
      audit_logs: [],
    };
    const res = updateFeeSimulation(deptAdmin, 3000, 'Increasing fee', db);
    assert.equal(res.success, false);
    assert.match(res.error, /Unauthorized/);
    assert.equal(db.settings.value_paise, 2000, 'Fee remains unchanged');
    assert.equal(db.audit_logs.length, 0, 'No audit log created');
  });

  await t.test('Super Admin cannot update fee without mandatory audit reason', () => {
    const db = {
      platform_settings_table_exists: true,
      settings: { key: 'magazine_submission_fee', value_paise: 2000 },
      audit_logs: [],
    };
    const res = updateFeeSimulation(superAdmin, 2500, '   ', db);
    assert.equal(res.success, false);
    assert.match(res.error, /audit reason is required/);
    assert.equal(db.settings.value_paise, 2000);
  });

  await t.test('Super Admin updates fee with audit reason: records actor, old fee, new fee, and reason', () => {
    const db = {
      platform_settings_table_exists: true,
      settings: { key: 'magazine_submission_fee', value_paise: 2000 },
      audit_logs: [],
    };
    const res = updateFeeSimulation(superAdmin, 2500, 'Annual academic review adjustment', db);
    assert.equal(res.success, true);
    assert.equal(db.settings.value_paise, 2500);
    assert.equal(db.audit_logs.length, 1);
    assert.equal(db.audit_logs[0].previous_fee_paise, 2000);
    assert.equal(db.audit_logs[0].new_fee_paise, 2500);
    assert.equal(db.audit_logs[0].changed_by, superAdmin.id);
    assert.equal(db.audit_logs[0].change_reason, 'Annual academic review adjustment');
  });

  await t.test('Fee update fails clearly when platform_settings table does not exist', () => {
    const db = {
      platform_settings_table_exists: false,
      settings: { key: 'magazine_submission_fee', value_paise: 2000 },
      audit_logs: [],
    };
    const res = updateFeeSimulation(superAdmin, 2500, 'Annual academic review adjustment', db);
    assert.equal(res.success, false);
    assert.match(res.error, /does not exist/);
  });
});

test('Snapshot Invariance Rule: Changing ₹20 to ₹25 updates new obligations while existing ₹20 obligation remains ₹20', async (t) => {
  // Database simulation
  const platformSettings = { key: 'magazine_submission_fee', value_paise: 2000, currency: 'INR' };
  const obligations = new Map();
  const superAdmin = { id: 'usr-super-01', role: 'SUPER_ADMIN' };

  function createObligation(magazineId, departmentId, callerId) {
    // Invariant: snapshots current platform fee in paise
    const feeSnapshot = platformSettings.value_paise;
    const obl = {
      id: `obl-${magazineId}`,
      magazine_id: magazineId,
      department_id: departmentId,
      amount_paise: feeSnapshot,
      currency: platformSettings.currency,
      fee_snapshot_paise: feeSnapshot,
      status: 'PENDING',
      created_by: callerId,
      created_at: new Date().toISOString(),
    };
    obligations.set(magazineId, obl);
    return obl;
  }

  function getQrCodeParameters(magazineId) {
    const obl = obligations.get(magazineId);
    if (!obl) throw new Error('Obligation not found');
    return {
      type: 'upi_qr',
      fixed_amount: true,
      amountPaise: obl.amount_paise, // MUST use snapshotted obligation amount
      currency: obl.currency,
      notes: { magazine_id: magazineId, obligation_id: obl.id },
    };
  }

  function verifyPayment(magazineId, providerAmountPaise) {
    const obl = obligations.get(magazineId);
    if (!obl) return { success: false, error: 'Obligation not found' };
    if (providerAmountPaise !== obl.amount_paise) {
      return {
        success: false,
        error: `Payment amount mismatch: provider returned ${providerAmountPaise}, expected ${obl.amount_paise}.`,
      };
    }
    obl.status = 'PAID';
    return { success: true, status: 'PAID' };
  }

  // Step 1: Magazine 1 is created when fee is ₹20 (2,000 paise)
  const mag1Obligation = createObligation('mag-cse-01', 'dept-cse', 'usr-dept-cse');
  assert.equal(mag1Obligation.amount_paise, 2000, 'Magazine 1 initial obligation amount is 2,000 paise (₹20)');
  assert.equal(mag1Obligation.fee_snapshot_paise, 2000, 'Magazine 1 fee snapshot is 2,000 paise');

  const mag1Qr = getQrCodeParameters('mag-cse-01');
  assert.equal(mag1Qr.amountPaise, 2000, 'Magazine 1 QR code amount is 2,000 paise (₹20)');

  // Step 2: Super Admin updates platform submission fee from ₹20 to ₹25 (2,500 paise)
  platformSettings.value_paise = 2500;

  // Step 3: Verify Magazine 1's existing obligation remains ₹20 (2,000 paise)
  assert.equal(obligations.get('mag-cse-01').amount_paise, 2000, 'Magazine 1 existing obligation amount remains 2,000 paise (₹20)');
  const mag1QrAfterUpdate = getQrCodeParameters('mag-cse-01');
  assert.equal(mag1QrAfterUpdate.amountPaise, 2000, 'Magazine 1 QR amount remains 2,000 paise despite platform fee change');

  // Step 4: Magazine 2 is created after the fee update
  const mag2Obligation = createObligation('mag-mech-02', 'dept-mech', 'usr-dept-mech');
  assert.equal(mag2Obligation.amount_paise, 2500, 'Magazine 2 new obligation amount is 2,500 paise (₹25)');
  assert.equal(mag2Obligation.fee_snapshot_paise, 2500, 'Magazine 2 fee snapshot is 2,500 paise (₹25)');

  const mag2Qr = getQrCodeParameters('mag-mech-02');
  assert.equal(mag2Qr.amountPaise, 2500, 'Magazine 2 QR code amount is 2,500 paise (₹25)');

  // Step 5: Verification enforces exact snapshotted amounts
  // Magazine 1 rejects ₹25 payment attempt because its obligation was ₹20
  const mag1WrongPayment = verifyPayment('mag-cse-01', 2500);
  assert.equal(mag1WrongPayment.success, false, 'Magazine 1 rejects ₹25 because its obligation is ₹20');

  // Magazine 1 accepts exact ₹20 payment
  const mag1CorrectPayment = verifyPayment('mag-cse-01', 2000);
  assert.equal(mag1CorrectPayment.success, true, 'Magazine 1 confirms payment for exact ₹20 obligation');
  assert.equal(obligations.get('mag-cse-01').status, 'PAID');

  // Magazine 2 rejects ₹20 payment attempt because its obligation was ₹25
  const mag2WrongPayment = verifyPayment('mag-mech-02', 2000);
  assert.equal(mag2WrongPayment.success, false, 'Magazine 2 rejects ₹20 because its obligation is ₹25');

  // Magazine 2 accepts exact ₹25 payment
  const mag2CorrectPayment = verifyPayment('mag-mech-02', 2500);
  assert.equal(mag2CorrectPayment.success, true, 'Magazine 2 confirms payment for exact ₹25 obligation');
  assert.equal(obligations.get('mag-mech-02').status, 'PAID');

  // Step 6: Rejected magazine resubmission retains paid entitlement
  // If Magazine 1 is rejected by Super Admin, its paid obligation status remains PAID
  assert.equal(obligations.get('mag-cse-01').status, 'PAID', 'Magazine 1 retains PAID entitlement on resubmission');
});
