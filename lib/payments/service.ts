import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Profile } from '@/types/auth';
import {
  PaymentStatus,
  MagazinePayment,
  PaymentAttempt,
  ManualUpiClaim,
  PlatformSettings,
  CreateOrderResult,
  PaymentVerificationResult,
  CreateDynamicQrResult,
  QrPaymentStatusResult,
} from '@/types/payment';
import { PAYMENT_CONFIG, validateFeePaise } from './config';
import {
  getRazorpayClient,
  getPublicRazorpayKeyId,
  isRazorpayTestMode,
  createRazorpayQrCode,
  fetchRazorpayQrPayments,
  fetchRazorpayQrCode,
  closeRazorpayQrCode,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from './razorpay';

// Type alias for internal Supabase calls
type DbClient = SupabaseClient<Database>;

/**
 * Detects missing-table / schema cache errors when payment migration has not yet been applied.
 */
export function isMissingTableError(err: any): boolean {
  if (!err) return false;
  const msg = (typeof err === 'string' ? err : err.message || err.details || '').toLowerCase();
  return (
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('pgrst205') ||
    msg.includes('could not find the table')
  );
}

/**
 * Isolated in-memory sandbox store for Razorpay Test Mode development.
 * Allows safe local testing of Dynamic QR, payment verification, and webhooks
 * WITHOUT mutating or executing SQL on the remote database.
 */
interface SandboxStore {
  obligations: Map<string, MagazinePayment>;
  attempts: Map<string, PaymentAttempt>;
  manualClaims: Map<string, ManualUpiClaim>;
  webhookEvents: Set<string>;
}

// Global singleton across hot-reloads in Next.js development runtime
const globalForSandbox = globalThis as unknown as {
  __the_rkive_payment_sandbox?: SandboxStore;
};

export const isolatedSandboxStore: SandboxStore = globalForSandbox.__the_rkive_payment_sandbox || {
  obligations: new Map(),
  attempts: new Map(),
  manualClaims: new Map(),
  webhookEvents: new Set(),
};

if (process.env.NODE_ENV !== 'production') {
  globalForSandbox.__the_rkive_payment_sandbox = isolatedSandboxStore;
}

export interface PlatformFeeConfigDetails {
  success: boolean;
  feePaise: number;
  isPersistent: boolean;
  currency: string;
  error?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Retrieves full fee configuration details from public.platform_settings.
 * Fails clearly with isPersistent: false if database table is unavailable.
 */
export async function getPlatformFeeDetails(supabase: DbClient): Promise<PlatformFeeConfigDetails> {
  try {
    const { data, error } = await (supabase.from('platform_settings') as any)
      .select('value_paise, currency, is_active, updated_at, updated_by')
      .eq('key', 'magazine_submission_fee')
      .maybeSingle();

    if (error) {
      const isMissing = isMissingTableError(error);
      return {
        success: false,
        feePaise: PAYMENT_CONFIG.DEFAULT_SUBMISSION_FEE_PAISE,
        isPersistent: false,
        currency: PAYMENT_CONFIG.CURRENCY,
        error: isMissing
          ? 'Platform settings table "public.platform_settings" does not exist in the connected database. Please review and apply migration 20261021_payment_system.sql.'
          : error.message || 'Failed to query platform settings.',
      };
    }

    if (!data) {
      return {
        success: false,
        feePaise: PAYMENT_CONFIG.DEFAULT_SUBMISSION_FEE_PAISE,
        isPersistent: false,
        currency: PAYMENT_CONFIG.CURRENCY,
        error: 'Submission fee setting ("magazine_submission_fee") is not found in platform_settings.',
      };
    }

    if (!Number.isInteger(data.value_paise) || !(data.is_active ?? true)) {
      return {
        success: false,
        feePaise: PAYMENT_CONFIG.DEFAULT_SUBMISSION_FEE_PAISE,
        isPersistent: false,
        currency: data.currency || PAYMENT_CONFIG.CURRENCY,
        error: 'Submission fee configuration in platform_settings is inactive or invalid.',
      };
    }

    return {
      success: true,
      feePaise: data.value_paise,
      isPersistent: true,
      currency: data.currency || PAYMENT_CONFIG.CURRENCY,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    };
  } catch (err: any) {
    return {
      success: false,
      feePaise: PAYMENT_CONFIG.DEFAULT_SUBMISSION_FEE_PAISE,
      isPersistent: false,
      currency: PAYMENT_CONFIG.CURRENCY,
      error: err.message || 'Unexpected error reading platform fee.',
    };
  }
}

/**
 * Retrieves the current platform-wide submission fee in integer paise.
 * Falls back to PAYMENT_CONFIG.DEFAULT_SUBMISSION_FEE_PAISE (2000 paise = ₹20) if unconfigured or unmigrated.
 */
export async function getPlatformFeePaise(supabase: DbClient): Promise<number> {
  const details = await getPlatformFeeDetails(supabase);
  return details.feePaise;
}

/**
 * Super Admin only: Updates the platform submission fee with audit logging.
 * Enforces server-side validation, mandatory audit reason, and persistent DB storage.
 */
export async function updatePlatformFeePaise(
  supabase: DbClient,
  callerProfile: Profile,
  newFeePaise: number,
  changeReason?: string
): Promise<{ success: boolean; error?: string }> {
  if (callerProfile.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Unauthorized: Only Super Administrators can configure platform fees.' };
  }

  const validation = validateFeePaise(newFeePaise);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const cleanReason = changeReason?.trim();
  if (!cleanReason || cleanReason.length < 3) {
    return { success: false, error: 'A mandatory audit reason (minimum 3 characters) is required to update the platform submission fee.' };
  }

  // 1. Read current fee from platform_settings
  const feeDetails = await getPlatformFeeDetails(supabase);
  if (!feeDetails.isPersistent && feeDetails.error?.includes('does not exist')) {
    return {
      success: false,
      error: 'Cannot update platform fee: table "public.platform_settings" does not exist in the database. Please review and apply migration 20261021_payment_system.sql to your development database.',
    };
  }
  const currentFee = feeDetails.feePaise;

  // 2. Upsert into platform_settings
  const now = new Date().toISOString();
  const { error: upsertErr } = await (supabase.from('platform_settings') as any)
    .upsert({
      key: 'magazine_submission_fee',
      value_paise: newFeePaise,
      currency: PAYMENT_CONFIG.CURRENCY,
      is_active: true,
      updated_by: callerProfile.id,
      updated_at: now,
    }, { onConflict: 'key' });

  if (upsertErr) {
    if (isMissingTableError(upsertErr)) {
      return {
        success: false,
        error: 'Database table "public.platform_settings" does not exist in the connected database. Please review and apply the payment migration (20261021_payment_system.sql) to enable persistent fee updates.',
      };
    }
    return { success: false, error: upsertErr.message || 'Failed to update platform fee in database.' };
  }

  // 3. Insert into platform_fee_audit_logs (MANDATORY AUDIT TRAIL)
  const { error: auditErr } = await (supabase.from('platform_fee_audit_logs') as any).insert({
    previous_fee_paise: currentFee,
    new_fee_paise: newFeePaise,
    changed_by: callerProfile.id,
    change_reason: cleanReason,
    created_at: now,
  });

  if (auditErr) {
    console.error('[Payments] Failed to record platform fee audit log:', auditErr);
    return {
      success: false,
      error: `Fee updated, but recording audit log failed: ${auditErr.message || 'Audit log insert failure'}.`,
    };
  }

  // 4. Append to general payment_audit_logs
  try {
    await (supabase.from('payment_audit_logs') as any).insert({
      event_type: 'PLATFORM_FEE_UPDATED',
      actor_id: callerProfile.id,
      actor_role: callerProfile.role,
      details: {
        previous_fee_paise: currentFee,
        new_fee_paise: newFeePaise,
        reason: cleanReason,
        timestamp: now,
      },
    });
  } catch (err) {
    console.warn('[Payments] Non-fatal general payment audit log warning:', err);
  }

  return { success: true };
}

/**
 * Checks whether a magazine has a confirmed paid obligation.
 * This is the single authoritative source of truth for payment gating.
 */
export async function hasValidPaidObligation(
  supabase: DbClient,
  magazineId: string
): Promise<boolean> {
  if (!magazineId) return false;

  try {
    const { data, error } = await (supabase.from('magazine_payments') as any)
      .select('id, status')
      .eq('magazine_id', magazineId)
      .eq('status', 'PAID')
      .maybeSingle();

    if (!error && data) {
      return true;
    }

    if (error) {
      console.error('[Payments] Error querying payment obligation:', error);
    }
  } catch (err) {
    console.error('[Payments] Error querying payment obligation:', err);
  }

  return false;
}

/**
 * Retrieves the full payment status and attempt history for a magazine.
 */
export async function getMagazinePaymentDetails(
  supabase: DbClient,
  magazineId: string,
  callerProfile: Profile
): Promise<{
  success: boolean;
  obligation: MagazinePayment | null;
  manualClaim: ManualUpiClaim | null;
  currentFeePaise: number;
  error?: string;
}> {
  const currentFeePaise = await getPlatformFeePaise(supabase);

  // 1. Fetch magazine and verify caller authorization
  const { data: magazine, error: magErr } = await (supabase.from('magazines') as any)
    .select('id, department_id, title')
    .eq('id', magazineId)
    .maybeSingle();

  if (magErr || !magazine) {
    return { success: false, obligation: null, manualClaim: null, currentFeePaise, error: 'Magazine not found.' };
  }

  if (callerProfile.role !== 'SUPER_ADMIN' && magazine.department_id !== callerProfile.department_id) {
    return { success: false, obligation: null, manualClaim: null, currentFeePaise, error: 'Forbidden: Department mismatch.' };
  }

  // 2. Fetch latest obligation
  let obligation: MagazinePayment | null = null;
  const { data: dbObl, error: oblErr } = await (supabase.from('magazine_payments') as any)
    .select('*')
    .eq('magazine_id', magazineId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  obligation = dbObl || null;

  if (oblErr && isMissingTableError(oblErr) && isRazorpayTestMode()) {
    const sandboxObl = isolatedSandboxStore.obligations.get(magazineId) || null;
    let sandboxClaim: ManualUpiClaim | null = null;
    if (sandboxObl) {
      sandboxClaim = isolatedSandboxStore.manualClaims.get(sandboxObl.id) || null;
    }
    return {
      success: true,
      obligation: sandboxObl,
      manualClaim: sandboxClaim,
      currentFeePaise,
    };
  }

  // 3. Auto-reconcile active Dynamic QR payment with Razorpay if pending
  if (
    obligation &&
    obligation.status === 'PENDING' &&
    obligation.payment_method === 'RAZORPAY_QR' &&
    obligation.metadata?.active_qr?.id
  ) {
    try {
      const qrId = obligation.metadata.active_qr.id;
      const statusRes = await checkQrPaymentStatus(supabase, { magazineId, qrId }, callerProfile);
      if (statusRes.paid) {
        const { data: refreshedObl } = await (supabase.from('magazine_payments') as any)
          .select('*')
          .eq('id', obligation.id)
          .maybeSingle();
        if (refreshedObl) {
          obligation = refreshedObl;
        } else {
          obligation.status = 'PAID';
        }
      }
    } catch (reconcileErr) {
      console.warn('[Payments] Note: QR auto-reconciliation non-fatal note:', reconcileErr);
    }
  }

  // 4. Fetch latest manual claim if exists
  let manualClaim: ManualUpiClaim | null = null;
  if (obligation) {
    const { data: claim } = await (supabase.from('manual_upi_claims') as any)
      .select('*')
      .eq('obligation_id', obligation.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    manualClaim = claim || null;
  }

  return {
    success: true,
    obligation: obligation || null,
    manualClaim,
    currentFeePaise,
  };
}

/**
 * Creates or retrieves a pending payment obligation and its corresponding Razorpay Order.
 * Snapshots the current platform fee and enforces strict idempotency.
 */
export async function createOrGetPaymentOrder(
  supabase: DbClient,
  magazineId: string,
  callerProfile: Profile
): Promise<CreateOrderResult> {
  try {
    // 1. Fetch magazine & enforce authorization
    const { data: magazine, error: magErr } = await (supabase.from('magazines') as any)
      .select('id, department_id, title, processing_status, page_count')
      .eq('id', magazineId)
      .maybeSingle();

    if (magErr || !magazine) {
      return { success: false, error: 'Publication record not found.' };
    }

    if (callerProfile.role !== 'SUPER_ADMIN' && magazine.department_id !== callerProfile.department_id) {
      return { success: false, error: 'Forbidden: You can only initiate payments for your own department.' };
    }

    // 2. Verify prerequisite: PDF processing must be completed
    if (magazine.processing_status !== 'COMPLETED' || !magazine.page_count || magazine.page_count <= 0) {
      return {
        success: false,
        error: 'PDF processing must be completed with rendered pages before initiating payment.',
      };
    }

    // 3. Check if already paid
    const isPaid = await hasValidPaidObligation(supabase, magazineId);
    if (isPaid) {
      return { success: true, isAlreadyPaid: true };
    }

    // 4. Fetch or create obligation
    const currentPlatformFee = await getPlatformFeePaise(supabase);

    let obligation: MagazinePayment;
    let usingSandbox = false;

    const { data: existingObligation, error: fetchOblErr } = await (supabase.from('magazine_payments') as any)
      .select('*')
      .eq('magazine_id', magazineId)
      .in('status', ['PENDING', 'MANUAL_VERIFICATION_PENDING'])
      .maybeSingle();

    if (fetchOblErr && isMissingTableError(fetchOblErr)) {
      if (isRazorpayTestMode()) {
        usingSandbox = true;
        let sandboxObl = isolatedSandboxStore.obligations.get(magazineId);
        if (!sandboxObl || sandboxObl.status === 'FAILED') {
          sandboxObl = {
            id: `obl_sandbox_${magazineId}`,
            magazine_id: magazineId,
            department_id: magazine.department_id,
            amount_paise: currentPlatformFee,
            currency: PAYMENT_CONFIG.CURRENCY,
            status: 'PENDING',
            payment_method: 'RAZORPAY',
            fee_snapshot_paise: currentPlatformFee,
            paid_at: null,
            verified_by: null,
            verified_at: null,
            rejection_reason: null,
            created_by: callerProfile.id,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          isolatedSandboxStore.obligations.set(magazineId, sandboxObl);
        }
        obligation = sandboxObl;
      } else {
        return {
          success: false,
          error: 'Payment obligation tables are not yet created in the database. Please review and apply the payment migration in the Supabase SQL editor.',
        };
      }
    } else if (existingObligation) {
      obligation = existingObligation;
    } else {
      const { data: newObligation, error: createObligationErr } = await (supabase.from('magazine_payments') as any)
        .insert({
          magazine_id: magazineId,
          department_id: magazine.department_id,
          amount_paise: currentPlatformFee,
          currency: PAYMENT_CONFIG.CURRENCY,
          status: 'PENDING',
          payment_method: 'RAZORPAY',
          fee_snapshot_paise: currentPlatformFee,
          created_by: callerProfile.id,
        })
        .select('*')
        .single();

      if (createObligationErr && isMissingTableError(createObligationErr) && isRazorpayTestMode()) {
        usingSandbox = true;
        obligation = {
          id: `obl_sandbox_${magazineId}`,
          magazine_id: magazineId,
          department_id: magazine.department_id,
          amount_paise: currentPlatformFee,
          currency: PAYMENT_CONFIG.CURRENCY,
          status: 'PENDING',
          payment_method: 'RAZORPAY',
          fee_snapshot_paise: currentPlatformFee,
          paid_at: null,
          verified_by: null,
          verified_at: null,
          rejection_reason: null,
          created_by: callerProfile.id,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        isolatedSandboxStore.obligations.set(magazineId, obligation);
      } else if (createObligationErr || !newObligation) {
        return {
          success: false,
          error: createObligationErr?.message || 'Failed to establish payment obligation.',
        };
      } else {
        obligation = newObligation;
      }
    }

    // 5. Check for recent valid uncompleted Razorpay order attempt (Idempotency)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    let recentAttempt: any = null;

    if (usingSandbox) {
      const att = isolatedSandboxStore.attempts.get(obligation.id);
      if (att && att.status === 'CREATED' && att.provider_order_id) {
        recentAttempt = att;
      }
    } else {
      const { data } = await (supabase.from('payment_attempts') as any)
        .select('*')
        .eq('obligation_id', obligation.id)
        .eq('status', 'CREATED')
        .gt('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      recentAttempt = data;
    }

    const publicRazorpayKey = getPublicRazorpayKeyId();
    if (!publicRazorpayKey) {
      return {
        success: false,
        error: 'Razorpay checkout public key is not configured in environment variables.',
      };
    }

    if (recentAttempt && recentAttempt.provider_order_id) {
      return {
        success: true,
        orderId: recentAttempt.provider_order_id,
        amountPaise: obligation.amount_paise,
        currency: obligation.currency,
        keyId: publicRazorpayKey,
        obligationId: obligation.id,
      };
    }

    // 6. Create Razorpay order via official server SDK
    const razorpay = getRazorpayClient();
    const shortReceipt = `rcpt_${magazineId.replace(/-/g, '').slice(0, 14)}`;

    const rzpOrder = await razorpay.orders.create({
      amount: obligation.amount_paise,
      currency: obligation.currency,
      receipt: shortReceipt,
      notes: {
        magazine_id: magazineId,
        department_id: magazine.department_id,
        obligation_id: obligation.id,
        title: magazine.title.slice(0, 40),
      },
    });

    if (!rzpOrder || !rzpOrder.id) {
      return { success: false, error: 'Razorpay order creation did not return a valid order ID.' };
    }

    // 7. Record attempt
    if (usingSandbox) {
      const attempt: any = {
        id: `att_sandbox_${Date.now()}`,
        obligation_id: obligation.id,
        magazine_id: magazineId,
        provider: 'RAZORPAY',
        provider_order_id: rzpOrder.id,
        amount_paise: obligation.amount_paise,
        currency: obligation.currency,
        status: 'CREATED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      isolatedSandboxStore.attempts.set(obligation.id, attempt);
      isolatedSandboxStore.attempts.set(rzpOrder.id, attempt);
    } else {
      try {
        await (supabase.from('payment_attempts') as any).insert({
          obligation_id: obligation.id,
          magazine_id: magazineId,
          provider: 'RAZORPAY',
          provider_order_id: rzpOrder.id,
          amount_paise: obligation.amount_paise,
          currency: obligation.currency,
          status: 'CREATED',
        });
      } catch (attErr) {
        if (isRazorpayTestMode()) {
          const attempt: any = {
            id: `att_sandbox_${Date.now()}`,
            obligation_id: obligation.id,
            magazine_id: magazineId,
            provider: 'RAZORPAY',
            provider_order_id: rzpOrder.id,
            amount_paise: obligation.amount_paise,
            currency: obligation.currency,
            status: 'CREATED',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          isolatedSandboxStore.attempts.set(obligation.id, attempt);
          isolatedSandboxStore.attempts.set(rzpOrder.id, attempt);
        }
      }
    }

    // 8. Log audit trail
    try {
      await (supabase.from('payment_audit_logs') as any).insert({
        event_type: 'ORDER_CREATED',
        magazine_id: magazineId,
        obligation_id: obligation.id,
        actor_id: callerProfile.id,
        actor_role: callerProfile.role,
        details: {
          order_id: rzpOrder.id,
          amount_paise: obligation.amount_paise,
          currency: obligation.currency,
        },
      });
    } catch (auditErr) {
      console.warn('[Payments] Non-fatal order audit log warning:', auditErr);
    }

    return {
      success: true,
      orderId: rzpOrder.id,
      amountPaise: obligation.amount_paise,
      currency: obligation.currency,
      keyId: publicRazorpayKey,
      obligationId: obligation.id,
    };
  } catch (err: any) {
    console.error('[Payments] Error in createOrGetPaymentOrder:', err);
    return { success: false, error: err.message || 'An unexpected error occurred during order creation.' };
  }
}

/**
 * Creates or retrieves a pending Dynamic UPI QR code via Razorpay QR Code API.
 * Enforces single-use, fixed-amount, expiration window, and strict idempotency.
 */
export async function createOrGetDynamicQr(
  supabase: DbClient,
  magazineId: string,
  callerProfile: Profile
): Promise<CreateDynamicQrResult> {
  try {
    // 1. Fetch magazine & enforce authorization
    const { data: magazine, error: magErr } = await (supabase.from('magazines') as any)
      .select('id, department_id, title, processing_status, page_count')
      .eq('id', magazineId)
      .maybeSingle();

    if (magErr || !magazine) {
      return { success: false, error: 'Publication record not found.' };
    }

    if (callerProfile.role !== 'SUPER_ADMIN' && magazine.department_id !== callerProfile.department_id) {
      return { success: false, error: 'Forbidden: You can only generate payment requests for your own department.' };
    }

    // 2. Verify prerequisite: PDF processing must be completed
    if (magazine.processing_status !== 'COMPLETED' || !magazine.page_count || magazine.page_count <= 0) {
      return {
        success: false,
        error: 'PDF processing must be completed with rendered pages before initiating payment.',
      };
    }

    // 3. Check if already paid
    const isPaid = await hasValidPaidObligation(supabase, magazineId);
    if (isPaid) {
      return { success: true, isAlreadyPaid: true };
    }

    // 4. Fetch or create obligation
    const currentPlatformFee = await getPlatformFeePaise(supabase);

    let obligation: MagazinePayment;
    let usingSandbox = false;

    const { data: existingObligation, error: fetchOblErr } = await (supabase.from('magazine_payments') as any)
      .select('*')
      .eq('magazine_id', magazineId)
      .in('status', ['PENDING', 'MANUAL_VERIFICATION_PENDING'])
      .maybeSingle();

    if (fetchOblErr && isMissingTableError(fetchOblErr)) {
      if (isRazorpayTestMode()) {
        usingSandbox = true;
        let sandboxObl = isolatedSandboxStore.obligations.get(magazineId);
        if (!sandboxObl || sandboxObl.status === 'FAILED') {
          sandboxObl = {
            id: `obl_sandbox_${magazineId}`,
            magazine_id: magazineId,
            department_id: magazine.department_id,
            amount_paise: currentPlatformFee,
            currency: PAYMENT_CONFIG.CURRENCY,
            status: 'PENDING',
            payment_method: 'RAZORPAY_QR',
            fee_snapshot_paise: currentPlatformFee,
            paid_at: null,
            verified_by: null,
            verified_at: null,
            rejection_reason: null,
            created_by: callerProfile.id,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          isolatedSandboxStore.obligations.set(magazineId, sandboxObl);
        }
        obligation = sandboxObl;
      } else {
        return {
          success: false,
          error: 'Payment obligation tables are not yet created in the database. Please review and apply the payment migration in the Supabase SQL editor.',
        };
      }
    } else if (existingObligation) {
      obligation = existingObligation;
    } else {
      const { data: newObligation, error: createObligationErr } = await (supabase.from('magazine_payments') as any)
        .insert({
          magazine_id: magazineId,
          department_id: magazine.department_id,
          amount_paise: currentPlatformFee,
          currency: PAYMENT_CONFIG.CURRENCY,
          status: 'PENDING',
          payment_method: 'RAZORPAY_QR',
          fee_snapshot_paise: currentPlatformFee,
          created_by: callerProfile.id,
        })
        .select('*')
        .single();

      if (createObligationErr && isMissingTableError(createObligationErr) && isRazorpayTestMode()) {
        usingSandbox = true;
        obligation = {
          id: `obl_sandbox_${magazineId}`,
          magazine_id: magazineId,
          department_id: magazine.department_id,
          amount_paise: currentPlatformFee,
          currency: PAYMENT_CONFIG.CURRENCY,
          status: 'PENDING',
          payment_method: 'RAZORPAY_QR',
          fee_snapshot_paise: currentPlatformFee,
          paid_at: null,
          verified_by: null,
          verified_at: null,
          rejection_reason: null,
          created_by: callerProfile.id,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        isolatedSandboxStore.obligations.set(magazineId, obligation);
      } else if (createObligationErr || !newObligation) {
        return {
          success: false,
          error: createObligationErr?.message || 'Failed to establish payment obligation.',
        };
      } else {
        obligation = newObligation;
      }
    }

    // 5. Check for recent valid active QR code (Idempotency within 20 mins)
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    let recentAttempt: any = null;

    if (usingSandbox) {
      const att: any = isolatedSandboxStore.attempts.get(obligation.id);
      if (att && att.status === 'CREATED' && att.provider_order_id) {
        const createdAt = new Date(att.created_at).getTime();
        if (Date.now() - createdAt < 20 * 60 * 1000) {
          recentAttempt = att;
        }
      }
    } else {
      const { data } = await (supabase.from('payment_attempts') as any)
        .select('*')
        .eq('obligation_id', obligation.id)
        .eq('provider', 'RAZORPAY_QR')
        .eq('status', 'CREATED')
        .gt('created_at', twentyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      recentAttempt = data;
    }

    const activeQr = obligation.metadata?.active_qr;
    const resolvedQrId = recentAttempt?.provider_order_id || activeQr?.id;
    const resolvedImageUrl =
      recentAttempt?.metadata?.image_url ||
      (activeQr?.id === resolvedQrId ? activeQr?.image_url : null) ||
      activeQr?.image_url;
    const resolvedCloseBy =
      recentAttempt?.metadata?.close_by ||
      (activeQr?.id === resolvedQrId ? activeQr?.close_by : null) ||
      activeQr?.close_by;

    const isSimulatedQr = Boolean(resolvedQrId?.startsWith('qr_test_sim_') || resolvedImageUrl?.startsWith('data:image/svg+xml'));
    const hasConfiguredKeys =
      Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) &&
      !process.env.RAZORPAY_KEY_ID?.includes('your_') &&
      !process.env.RAZORPAY_KEY_SECRET?.includes('your_');

    if (resolvedQrId && resolvedImageUrl && (!isSimulatedQr || !hasConfiguredKeys)) {
      const nowUnix = Math.floor(Date.now() / 1000);
      if (!resolvedCloseBy || resolvedCloseBy > nowUnix + 60) {
        return {
          success: true,
          qrId: resolvedQrId,
          imageUrl: resolvedImageUrl,
          amountPaise: obligation.amount_paise,
          currency: obligation.currency,
          closeBy: resolvedCloseBy,
          obligationId: obligation.id,
          status: 'active',
          isTestMode: isRazorpayTestMode(),
        };
      }
    }

    // 6. Generate Razorpay Dynamic UPI QR code via official API
    let qrResponse: any;
    try {
      qrResponse = await createRazorpayQrCode({
        amountPaise: obligation.amount_paise,
        name: 'The Rkive Editorial Submission',
        description: `Submission Fee: ${magazine.title.slice(0, 20)}`,
        closeByMinutes: 30,
        notes: {
          magazine_id: magazineId,
          department_id: magazine.department_id,
          obligation_id: obligation.id,
        },
      });
    } catch (qrErr: any) {
      const isAuthError =
        qrErr?.statusCode === 401 ||
        qrErr?.error?.description === 'Authentication failed' ||
        qrErr?.message?.includes('Authentication failed') ||
        process.env.RAZORPAY_KEY_ID?.includes('your_') ||
        process.env.RAZORPAY_KEY_SECRET?.includes('your_');

      if (isRazorpayTestMode() && isAuthError) {
        console.warn('[Payments] Razorpay test credentials unauthenticated or placeholder keys used. Falling back to local test simulation QR.');
        const nowUnix = Math.floor(Date.now() / 1000);
        const closeByUnix = nowUnix + 1800;
        const simQrId = `qr_test_sim_${Date.now().toString(36)}`;
        const simSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="#ffffff" rx="8"/><rect x="20" y="20" width="60" height="60" fill="#171717"/><rect x="30" y="30" width="40" height="40" fill="#ffffff"/><rect x="40" y="40" width="20" height="20" fill="#171717"/><rect x="120" y="20" width="60" height="60" fill="#171717"/><rect x="130" y="30" width="40" height="40" fill="#ffffff"/><rect x="140" y="40" width="20" height="20" fill="#171717"/><rect x="20" y="120" width="60" height="60" fill="#171717"/><rect x="30" y="130" width="40" height="40" fill="#ffffff"/><rect x="40" y="140" width="20" height="20" fill="#171717"/><rect x="100" y="100" width="20" height="20" fill="#f59e0b"/><rect x="130" y="130" width="40" height="40" fill="#171717"/><text x="100" y="185" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="#555">TEST MODE QR</text></svg>`;
        qrResponse = {
          id: simQrId,
          imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(simSvg)}`,
          closeBy: closeByUnix,
          status: 'active',
          amountPaise: obligation.amount_paise,
        };
      } else {
        throw qrErr;
      }
    }

    // 7. Record attempt in database
    if (usingSandbox) {
      const attempt: any = {
        id: `att_sandbox_${Date.now()}`,
        obligation_id: obligation.id,
        magazine_id: magazineId,
        provider: 'RAZORPAY_QR',
        provider_order_id: qrResponse.id,
        amount_paise: obligation.amount_paise,
        currency: obligation.currency,
        status: 'CREATED',
        metadata: {
          image_url: qrResponse.imageUrl,
          close_by: qrResponse.closeBy,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      isolatedSandboxStore.attempts.set(obligation.id, attempt);
      isolatedSandboxStore.attempts.set(qrResponse.id, attempt);
      obligation.metadata = {
        ...obligation.metadata,
        active_qr: {
          id: qrResponse.id,
          image_url: qrResponse.imageUrl,
          close_by: qrResponse.closeBy,
        },
      };
      isolatedSandboxStore.obligations.set(magazineId, obligation);
    } else {
      try {
        await (supabase.from('payment_attempts') as any).insert({
          obligation_id: obligation.id,
          magazine_id: magazineId,
          provider: 'RAZORPAY_QR',
          provider_order_id: qrResponse.id,
          amount_paise: obligation.amount_paise,
          currency: obligation.currency,
          status: 'CREATED',
        });
      } catch (insertErr) {
        console.warn('[Payments] Note: payment_attempts insert warning:', insertErr);
      }

      await (supabase.from('magazine_payments') as any)
        .update({
          payment_method: 'RAZORPAY_QR',
          metadata: {
            ...(obligation.metadata || {}),
            active_qr: {
              id: qrResponse.id,
              image_url: qrResponse.imageUrl,
              close_by: qrResponse.closeBy,
            },
          },
        })
        .eq('id', obligation.id);
    }

    // 8. Log audit trail
    try {
      await (supabase.from('payment_audit_logs') as any).insert({
        event_type: 'QR_CODE_CREATED',
        magazine_id: magazineId,
        obligation_id: obligation.id,
        actor_id: callerProfile.id,
        actor_role: callerProfile.role,
        details: {
          qr_id: qrResponse.id,
          amount_paise: obligation.amount_paise,
          close_by: qrResponse.closeBy,
        },
      });
    } catch {
      // non-fatal audit log warning
    }

    return {
      success: true,
      qrId: qrResponse.id,
      imageUrl: qrResponse.imageUrl,
      amountPaise: obligation.amount_paise,
      currency: obligation.currency,
      closeBy: qrResponse.closeBy,
      obligationId: obligation.id,
      status: qrResponse.status,
      isTestMode: isRazorpayTestMode(),
    };
  } catch (err: any) {
    console.error('[Payments] Error in createOrGetDynamicQr:', err);
    return { success: false, error: err.message || 'Failed to generate dynamic UPI QR code.' };
  }
}

/**
 * Polls the verification state of a dynamic UPI QR payment.
 * Inspects both local obligation state and Razorpay QR payment collection API.
 */
export async function checkQrPaymentStatus(
  supabase: DbClient,
  params: {
    magazineId: string;
    qrId: string;
  },
  callerProfile: Profile
): Promise<QrPaymentStatusResult> {
  const { magazineId, qrId } = params;

  try {
    // 1. Fetch obligation
    let obligation: MagazinePayment | null = null;
    let usingSandbox = false;

    const { data: dbObl, error: oblErr } = await (supabase.from('magazine_payments') as any)
      .select('*')
      .eq('magazine_id', magazineId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (oblErr && isMissingTableError(oblErr) && isRazorpayTestMode()) {
      usingSandbox = true;
      obligation = isolatedSandboxStore.obligations.get(magazineId) || null;
    } else {
      obligation = dbObl || null;
    }

    if (!obligation) {
      return { success: false, paid: false, error: 'Payment obligation not found.' };
    }

    if (callerProfile.role !== 'SUPER_ADMIN' && obligation.department_id !== callerProfile.department_id) {
      return { success: false, paid: false, error: 'Forbidden: Department mismatch.' };
    }

    // Already marked PAID? (e.g. from webhook or concurrent check)
    if (obligation.status === 'PAID') {
      return {
        success: true,
        paid: true,
        status: 'PAID',
        paymentId: obligation.metadata?.razorpay_payment_id || null,
      };
    }

    // In local test simulation mode, if simulated QR is active, polling stays pending until simulation
    if (isRazorpayTestMode() && qrId.startsWith('qr_test_sim_')) {
      return { success: true, paid: false, status: obligation.status };
    }

    // 2. Query Razorpay API for this QR code
    const paymentsList = await fetchRazorpayQrPayments(qrId);
    const capturedPayment = paymentsList?.items?.find((p: any) => p.status === 'captured');

    if (!capturedPayment) {
      // Fallback check on QR entity status
      const qrEntity = await fetchRazorpayQrCode(qrId);
      if (qrEntity && qrEntity.payments_amount_received >= obligation.amount_paise) {
        const paidAt = new Date().toISOString();
        if (usingSandbox) {
          obligation.status = 'PAID';
          obligation.paid_at = paidAt;
          obligation.metadata = {
            ...obligation.metadata,
            qr_id: qrId,
            qr_confirmed: true,
          };
          isolatedSandboxStore.obligations.set(magazineId, obligation);
        } else {
          await (supabase.from('magazine_payments') as any)
            .update({
              status: 'PAID',
              payment_method: 'RAZORPAY_QR',
              paid_at: paidAt,
              metadata: {
                ...obligation.metadata,
                qr_id: qrId,
                qr_confirmed: true,
              },
              updated_at: paidAt,
            })
            .eq('id', obligation.id);
        }

        return { success: true, paid: true, status: 'PAID' };
      }

      return { success: true, paid: false, status: obligation.status };
    }

    // 3. Captured payment found: Validate amount and currency
    if (capturedPayment.amount !== obligation.amount_paise) {
      return { success: false, paid: false, error: 'Payment amount mismatch.' };
    }

    if (capturedPayment.currency !== 'INR' && capturedPayment.currency !== obligation.currency) {
      return { success: false, paid: false, error: 'Payment currency mismatch.' };
    }

    // Cross-magazine fraud prevention: Check provider payment ID hasn't been credited to another obligation
    if (usingSandbox) {
      let isCrossClaimed = false;
      isolatedSandboxStore.attempts.forEach((att) => {
        if (att.provider_payment_id === capturedPayment.id && att.obligation_id !== obligation!.id) {
          isCrossClaimed = true;
        }
      });
      if (isCrossClaimed) {
        return { success: false, paid: false, error: 'This payment ID has already been credited to another publication obligation.' };
      }
    } else {
      const { data: existingPaymentAttempt } = await (supabase.from('payment_attempts') as any)
        .select('obligation_id, magazine_id')
        .eq('provider_payment_id', capturedPayment.id)
        .maybeSingle();

      if (existingPaymentAttempt && existingPaymentAttempt.obligation_id !== obligation.id) {
        return { success: false, paid: false, error: 'This payment ID has already been credited to another publication obligation.' };
      }
    }

    // 4. Update attempt and obligation to PAID
    const paidAt = new Date().toISOString();
    if (usingSandbox) {
      obligation.status = 'PAID';
      obligation.paid_at = paidAt;
      obligation.metadata = {
        ...obligation.metadata,
        razorpay_payment_id: capturedPayment.id,
        qr_id: qrId,
      };
      isolatedSandboxStore.obligations.set(magazineId, obligation);
      const att = isolatedSandboxStore.attempts.get(qrId);
      if (att) {
        att.provider_payment_id = capturedPayment.id;
        att.status = 'CAPTURED';
        att.updated_at = paidAt;
      }
    } else {
      try {
        await (supabase.from('payment_attempts') as any)
          .update({
            provider_payment_id: capturedPayment.id,
            status: 'CAPTURED',
            updated_at: paidAt,
          })
          .eq('provider_order_id', qrId);
      } catch {
        // non-fatal
      }

      await (supabase.from('magazine_payments') as any)
        .update({
          status: 'PAID',
          payment_method: 'RAZORPAY_QR',
          paid_at: paidAt,
          metadata: {
            ...obligation.metadata,
            razorpay_payment_id: capturedPayment.id,
            qr_id: qrId,
          },
          updated_at: paidAt,
        })
        .eq('id', obligation.id);
    }

    try {
      await (supabase.from('payment_audit_logs') as any).insert({
        event_type: 'QR_PAYMENT_VERIFIED_CAPTURED',
        magazine_id: magazineId,
        obligation_id: obligation.id,
        actor_id: callerProfile.id,
        actor_role: callerProfile.role,
        details: {
          qr_id: qrId,
          payment_id: capturedPayment.id,
          amount_paise: obligation.amount_paise,
        },
      });
    } catch {
      // ignore
    }

    return {
      success: true,
      paid: true,
      status: 'PAID',
      paymentId: capturedPayment.id,
    };
  } catch (err: any) {
    console.error('[Payments] Error in checkQrPaymentStatus:', err);
    return { success: false, paid: false, error: err.message || 'Status check failed.' };
  }
}

/**
 * Simulates a successful UPI payment in Razorpay Test Mode only.
 * Strictly blocked in live mode.
 */
export async function simulateTestQrPayment(
  supabase: DbClient,
  params: {
    magazineId: string;
    qrId: string;
  },
  callerProfile: Profile
): Promise<{ success: boolean; error?: string }> {
  // CRITICAL SECURITY GUARD: Strictly prohibited in live mode!
  if (!isRazorpayTestMode()) {
    return { success: false, error: 'Payment simulation is strictly forbidden in live mode.' };
  }

  const { magazineId, qrId } = params;

  // 1. Fetch obligation
  let obligation: MagazinePayment | null = null;
  let usingSandbox = false;

  const { data: dbObl, error: oblErr } = await (supabase.from('magazine_payments') as any)
    .select('*')
    .eq('magazine_id', magazineId)
    .in('status', ['PENDING', 'MANUAL_VERIFICATION_PENDING', 'PAID'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (oblErr && isMissingTableError(oblErr) && isRazorpayTestMode()) {
    usingSandbox = true;
    obligation = isolatedSandboxStore.obligations.get(magazineId) || null;
  } else {
    obligation = dbObl || null;
  }

  if (!obligation) {
    return { success: false, error: 'Payment obligation not found.' };
  }

  if (callerProfile.role !== 'SUPER_ADMIN' && obligation.department_id !== callerProfile.department_id) {
    return { success: false, error: 'Forbidden: Department mismatch.' };
  }

  if (obligation.status === 'PAID') {
    return { success: true };
  }

  const paidAt = new Date().toISOString();
  const simulatedPaymentId = `pay_test_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;

  if (usingSandbox) {
    obligation.status = 'PAID';
    obligation.paid_at = paidAt;
    obligation.metadata = {
      ...obligation.metadata,
      razorpay_payment_id: simulatedPaymentId,
      qr_id: qrId,
      is_test_simulated: true,
    };
    isolatedSandboxStore.obligations.set(magazineId, obligation);
    const att = isolatedSandboxStore.attempts.get(qrId);
    if (att) {
      att.provider_payment_id = simulatedPaymentId;
      att.status = 'CAPTURED';
      att.updated_at = paidAt;
    }
    return { success: true };
  }

  // Update attempt if table exists
  try {
    await (supabase.from('payment_attempts') as any)
      .update({
        provider_payment_id: simulatedPaymentId,
        status: 'CAPTURED',
        updated_at: paidAt,
      })
      .eq('provider_order_id', qrId);
  } catch {
    // ignore
  }

  // Update obligation to PAID
  await (supabase.from('magazine_payments') as any)
    .update({
      status: 'PAID',
      payment_method: 'RAZORPAY_QR',
      paid_at: paidAt,
      metadata: {
        ...obligation.metadata,
        razorpay_payment_id: simulatedPaymentId,
        qr_id: qrId,
        is_test_simulated: true,
      },
      updated_at: paidAt,
    })
    .eq('id', obligation.id);

  try {
    await (supabase.from('payment_audit_logs') as any).insert({
      event_type: 'TEST_QR_PAYMENT_SIMULATED',
      magazine_id: magazineId,
      obligation_id: obligation.id,
      actor_id: callerProfile.id,
      actor_role: callerProfile.role,
      details: {
        qr_id: qrId,
        simulated_payment_id: simulatedPaymentId,
        amount_paise: obligation.amount_paise,
      },
    });
  } catch {
    // ignore
  }

  return { success: true };
}

/**
 * Verifies Razorpay payment signature and confirms capture state.
 * Transitions payment obligation to PAID upon verification.
 */
export async function verifyAndConfirmPayment(
  supabase: DbClient,
  params: {
    magazineId: string;
    orderId: string;
    paymentId: string;
    signature: string;
  },
  callerProfile: Profile
): Promise<PaymentVerificationResult> {
  const { magazineId, orderId, paymentId, signature } = params;

  try {
    // 1. Verify cryptographic HMAC-SHA256 signature
    const isValidSignature = verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!isValidSignature) {
      console.warn('[Payments] Cryptographic signature check FAILED for payment:', { orderId, paymentId });
      return { success: false, error: 'Payment signature verification failed. Untrusted response.' };
    }

    // 2. Fetch obligation
    let obligation: MagazinePayment | null = null;
    let usingSandbox = false;

    const { data: dbObl, error: oblErr } = await (supabase.from('magazine_payments') as any)
      .select('*')
      .eq('magazine_id', magazineId)
      .in('status', ['PENDING', 'MANUAL_VERIFICATION_PENDING', 'PAID'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (oblErr && isMissingTableError(oblErr) && isRazorpayTestMode()) {
      usingSandbox = true;
      obligation = isolatedSandboxStore.obligations.get(magazineId) || null;
    } else {
      obligation = dbObl || null;
    }

    if (!obligation) {
      return { success: false, error: 'Payment obligation not found for this magazine.' };
    }

    // Caller authorization: Ensure user belongs to this department (or is Super Admin)
    if (callerProfile.role !== 'SUPER_ADMIN' && obligation.department_id !== callerProfile.department_id) {
      return { success: false, error: 'Forbidden: You can only verify payments for your own department.' };
    }

    // Verify signed provider order ID was generated for this specific obligation
    let matchingAttempt: any = null;
    if (usingSandbox) {
      matchingAttempt = isolatedSandboxStore.attempts.get(orderId) || isolatedSandboxStore.attempts.get(obligation.id);
    } else {
      const { data } = await (supabase.from('payment_attempts') as any)
        .select('id, obligation_id, provider_order_id, status')
        .eq('obligation_id', obligation.id)
        .eq('provider_order_id', orderId)
        .maybeSingle();
      matchingAttempt = data;
    }

    if (!matchingAttempt) {
      return { success: false, error: 'Signed provider order ID does not belong to this payment obligation.' };
    }

    // Cross-magazine fraud prevention: Check provider payment ID hasn't been credited to another obligation
    if (usingSandbox) {
      let isDuplicate = false;
      isolatedSandboxStore.attempts.forEach((att) => {
        if (att.provider_payment_id === paymentId && att.obligation_id !== obligation!.id) {
          isDuplicate = true;
        }
      });
      if (isDuplicate) {
        return {
          success: false,
          error: 'This payment ID has already been credited to another publication obligation.',
        };
      }
    } else {
      const { data: existingPaymentAttempt } = await (supabase.from('payment_attempts') as any)
        .select('obligation_id, magazine_id')
        .eq('provider_payment_id', paymentId)
        .maybeSingle();

      if (existingPaymentAttempt && existingPaymentAttempt.obligation_id !== obligation.id) {
        return {
          success: false,
          error: 'This payment ID has already been credited to another publication obligation.',
        };
      }
    }

    if (obligation.status === 'PAID') {
      return { success: true, magazineId, obligationId: obligation.id, paymentId, status: 'PAID' };
    }

    // 3. Confirm payment state via Razorpay REST API
    const razorpay = getRazorpayClient();
    const rzpPayment = await razorpay.payments.fetch(paymentId);

    if (!rzpPayment || rzpPayment.order_id !== orderId) {
      return { success: false, error: 'Provider order ID mismatch on retrieved payment.' };
    }

    if (rzpPayment.amount !== obligation.amount_paise) {
      return { success: false, error: 'Payment amount mismatch between provider and obligation.' };
    }

    if (rzpPayment.currency !== 'INR' && rzpPayment.currency !== obligation.currency) {
      return {
        success: false,
        error: `Payment currency mismatch: provider returned '${rzpPayment.currency}', expected '${obligation.currency}'.`,
      };
    }

    // If authorized but not captured, trigger capture and verify response
    if (rzpPayment.status === 'authorized') {
      const capturedPayment = await razorpay.payments.capture(paymentId, obligation.amount_paise, obligation.currency);
      if (!capturedPayment || capturedPayment.status !== 'captured') {
        return { success: false, error: `Failed to capture authorized payment (status: ${capturedPayment?.status || 'unknown'}).` };
      }
    } else if (rzpPayment.status !== 'captured') {
      return { success: false, error: `Payment is in non-completed state: '${rzpPayment.status}'.` };
    }

    // 4. Update attempt record
    const paidAt = new Date().toISOString();
    if (usingSandbox) {
      const att = isolatedSandboxStore.attempts.get(orderId) || isolatedSandboxStore.attempts.get(obligation.id);
      if (att) {
        att.provider_payment_id = paymentId;
        att.provider_signature = signature;
        att.status = 'CAPTURED';
        att.updated_at = paidAt;
      }
      obligation.status = 'PAID';
      obligation.paid_at = paidAt;
      obligation.metadata = {
        ...obligation.metadata,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
      };
      isolatedSandboxStore.obligations.set(magazineId, obligation);
    } else {
      await (supabase.from('payment_attempts') as any)
        .update({
          provider_payment_id: paymentId,
          provider_signature: signature,
          status: 'CAPTURED',
          updated_at: paidAt,
        })
        .eq('provider_order_id', orderId);

      // 5. Update obligation to PAID
      const { error: updateOblErr } = await (supabase.from('magazine_payments') as any)
        .update({
          status: 'PAID',
          payment_method: 'RAZORPAY',
          paid_at: paidAt,
          metadata: {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
          },
          updated_at: paidAt,
        })
        .eq('id', obligation.id);

      if (updateOblErr) {
        return { success: false, error: updateOblErr.message || 'Failed to update payment status.' };
      }
    }

    // 6. Record financial audit log
    try {
      await (supabase.from('payment_audit_logs') as any).insert({
        event_type: 'PAYMENT_VERIFIED_CAPTURED',
        magazine_id: magazineId,
        obligation_id: obligation.id,
        actor_id: callerProfile.id,
        actor_role: callerProfile.role,
        details: {
          order_id: orderId,
          payment_id: paymentId,
          amount_paise: obligation.amount_paise,
          paid_at: paidAt,
        },
      });
    } catch (auditErr) {
      console.warn('[Payments] Non-fatal audit log warning:', auditErr);
    }

    return {
      success: true,
      magazineId,
      obligationId: obligation.id,
      paymentId,
      status: 'PAID',
    };
  } catch (err: any) {
    console.error('[Payments] Error in verifyAndConfirmPayment:', err);
    return { success: false, error: err.message || 'Payment verification encountered an unexpected error.' };
  }
}

/**
 * Handles incoming asynchronous Razorpay webhooks.
 * Enforces cryptographic HMAC signature check and event deduplication ledger.
 */
export async function handleRazorpayWebhook(
  supabase: DbClient,
  rawBody: string,
  signatureHeader: string | null,
  eventIdHeader?: string | null
): Promise<{ success: boolean; duplicate?: boolean; error?: string }> {
  if (!signatureHeader) {
    return { success: false, error: 'Missing x-razorpay-signature header.' };
  }

  // 1. Verify webhook signature against raw request body
  const isValid = verifyWebhookSignature({
    rawBody,
    signature: signatureHeader,
  });

  if (!isValid) {
    return { success: false, error: 'Invalid webhook signature.' };
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { success: false, error: 'Invalid webhook JSON payload.' };
  }

  const eventType = event?.event;
  const paymentEntity = event?.payload?.payment?.entity;
  const qrEntity = event?.payload?.qr_code?.entity;
  const orderEntity = event?.payload?.order?.entity;

  // Razorpay sends eventId in the X-Razorpay-Event-Id header.
  // Fall back to body properties or deterministic payload ID.
  const eventId =
    eventIdHeader ||
    event?.event_id ||
    event?.id ||
    (paymentEntity?.id ? `evt_${eventType}_${paymentEntity.id}` : null) ||
    (qrEntity?.id ? `evt_${eventType}_${qrEntity.id}` : null) ||
    (orderEntity?.id ? `evt_${eventType}_${orderEntity.id}` : null);

  if (!eventId || !eventType) {
    return { success: false, error: 'Malformed webhook event metadata.' };
  }

  // 2. Deduplicate using payment_webhook_events
  const { data: existingEvent, error: dedupErr } = await (supabase.from('payment_webhook_events') as any)
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle();

  if (dedupErr && isMissingTableError(dedupErr) && isRazorpayTestMode()) {
    if (isolatedSandboxStore.webhookEvents.has(eventId)) {
      return { success: true, duplicate: true };
    }
    isolatedSandboxStore.webhookEvents.add(eventId);
  } else if (existingEvent) {
    return { success: true, duplicate: true };
  }

  // 3. Handle events
  if (eventType === 'payment.captured' || eventType === 'order.paid' || eventType === 'qr_code.credited') {
    const qrId = qrEntity?.id;
    const paymentId = paymentEntity?.id;
    const orderId = paymentEntity?.order_id || orderEntity?.id;

    // Validate captured status: payment must be captured
    if (paymentEntity?.status && paymentEntity.status !== 'captured') {
      return { success: false, error: `Payment is not in captured status: ${paymentEntity.status}` };
    }

    // Find matching attempt & obligation
    let attempt: any = null;
    let usingSandbox = false;

    // A. Check by QR ID first if qr_code entity present
    if (qrId) {
      if (isRazorpayTestMode()) {
        attempt = isolatedSandboxStore.attempts.get(qrId);
        if (attempt) usingSandbox = true;
      }
      if (!attempt) {
        const { data: qrAttempt, error: attErr } = await (supabase.from('payment_attempts') as any)
          .select('id, obligation_id, magazine_id, amount_paise, status, provider_order_id')
          .eq('provider_order_id', qrId)
          .maybeSingle();
        if (attErr && isMissingTableError(attErr) && isRazorpayTestMode()) {
          usingSandbox = true;
          attempt = isolatedSandboxStore.attempts.get(qrId) || null;
        } else {
          attempt = qrAttempt;
        }
      }
    }

    // B. Check by Order ID if not found
    if (!attempt && orderId) {
      if (isRazorpayTestMode()) {
        attempt = isolatedSandboxStore.attempts.get(orderId);
        if (attempt) usingSandbox = true;
      }
      if (!attempt) {
        const { data: orderAttempt } = await (supabase.from('payment_attempts') as any)
          .select('id, obligation_id, magazine_id, amount_paise, status, provider_order_id')
          .eq('provider_order_id', orderId)
          .maybeSingle();
        attempt = orderAttempt;
      }
    }

    // C. Check by notes.obligation_id if available on QR or payment entity
    const notesObligationId = qrEntity?.notes?.obligation_id || paymentEntity?.notes?.obligation_id;
    if (!attempt && notesObligationId) {
      if (isRazorpayTestMode()) {
        attempt = isolatedSandboxStore.attempts.get(notesObligationId);
        if (attempt) usingSandbox = true;
      }
      if (!attempt) {
        const { data: notesAttempt } = await (supabase.from('payment_attempts') as any)
          .select('id, obligation_id, magazine_id, amount_paise, status, provider_order_id')
          .eq('obligation_id', notesObligationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        attempt = notesAttempt;
      }
    }

    // D. Check magazine_payments active_qr metadata fallback
    let fallbackObligation: MagazinePayment | null = null;
    if (!attempt && qrId) {
      const { data: oblByQr } = await (supabase.from('magazine_payments') as any)
        .select('*')
        .contains('metadata', { active_qr: { id: qrId } })
        .maybeSingle();
      if (oblByQr) {
        fallbackObligation = oblByQr;
      }
    }

    const obligationId = attempt?.obligation_id || fallbackObligation?.id;
    const magazineId = attempt?.magazine_id || fallbackObligation?.magazine_id;
    const expectedAmountPaise = attempt?.amount_paise || fallbackObligation?.amount_paise;

    if (obligationId && magazineId) {
      // Enforce amount consistency (in integer paise)
      const receivedAmount = paymentEntity?.amount ?? qrEntity?.payments_amount_received;
      if (receivedAmount !== undefined && expectedAmountPaise !== undefined && receivedAmount !== expectedAmountPaise) {
        console.warn('[Payments Webhook] Amount mismatch detected:', {
          expected: expectedAmountPaise,
          received: receivedAmount,
        });
        return { success: false, error: 'Webhook payment amount mismatch with obligation.' };
      }

      // Enforce INR currency
      if (paymentEntity?.currency && paymentEntity.currency !== 'INR') {
        console.warn('[Payments Webhook] Non-INR currency detected:', paymentEntity.currency);
        return { success: false, error: 'Webhook payment currency must be INR.' };
      }

      // Cross-magazine fraud prevention: Ensure paymentId hasn't already been credited elsewhere
      if (paymentId) {
        if (usingSandbox) {
          let isCrossClaimed = false;
          isolatedSandboxStore.attempts.forEach((att) => {
            if (att.provider_payment_id === paymentId && att.obligation_id !== obligationId) {
              isCrossClaimed = true;
            }
          });
          if (isCrossClaimed) {
            return { success: false, error: 'This payment ID has already been credited to another publication obligation.' };
          }
        } else {
          const { data: existingPaymentAttempt } = await (supabase.from('payment_attempts') as any)
            .select('obligation_id, magazine_id')
            .eq('provider_payment_id', paymentId)
            .maybeSingle();

          if (existingPaymentAttempt && existingPaymentAttempt.obligation_id !== obligationId) {
            return { success: false, error: 'This payment ID has already been credited to another publication obligation.' };
          }
        }
      }

      const method = eventType === 'qr_code.credited' ? 'RAZORPAY_QR' : 'RAZORPAY';
      const paidAt = new Date().toISOString();

      if (usingSandbox) {
        if (attempt) {
          attempt.provider_payment_id = paymentId || null;
          attempt.status = 'CAPTURED';
          attempt.updated_at = paidAt;
          if (qrId) isolatedSandboxStore.attempts.set(qrId, attempt);
          if (orderId) isolatedSandboxStore.attempts.set(orderId, attempt);
        }

        const obl = isolatedSandboxStore.obligations.get(magazineId);
        if (obl) {
          obl.status = 'PAID';
          obl.payment_method = method;
          obl.paid_at = paidAt;
          obl.metadata = {
            ...obl.metadata,
            razorpay_order_id: orderId || null,
            razorpay_payment_id: paymentId || null,
            qr_id: qrId || null,
            webhook_confirmed: true,
          };
          isolatedSandboxStore.obligations.set(magazineId, obl);
        }
      } else {
        // Update payment_attempts record
        if (attempt?.id) {
          await (supabase.from('payment_attempts') as any)
            .update({
              provider_payment_id: paymentId || null,
              status: 'CAPTURED',
              updated_at: paidAt,
            })
            .eq('id', attempt.id);
        } else if (qrId) {
          await (supabase.from('payment_attempts') as any)
            .update({
              provider_payment_id: paymentId || null,
              status: 'CAPTURED',
              updated_at: paidAt,
            })
            .eq('provider_order_id', qrId);
        }

        // Update magazine_payments obligation to PAID
        await (supabase.from('magazine_payments') as any)
          .update({
            status: 'PAID',
            payment_method: method,
            paid_at: paidAt,
            metadata: {
              ...(fallbackObligation?.metadata || {}),
              razorpay_order_id: orderId || null,
              razorpay_payment_id: paymentId || null,
              qr_id: qrId || null,
              webhook_confirmed: true,
            },
            updated_at: paidAt,
          })
          .eq('id', obligationId);
      }

      try {
        await (supabase.from('payment_audit_logs') as any).insert({
          event_type: eventType === 'qr_code.credited' ? 'WEBHOOK_QR_PAYMENT_CAPTURED' : 'WEBHOOK_PAYMENT_CAPTURED',
          magazine_id: magazineId,
          obligation_id: obligationId,
          details: { event_id: eventId, order_id: orderId, payment_id: paymentId, qr_id: qrId || null },
        });
      } catch {
        // ignore non-fatal audit log insert
      }
    }
  } else if (eventType === 'payment.failed') {
    const paymentEntity = event?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;

    if (orderId) {
      // Out-of-order protection: Do not downgrade an attempt that was already CAPTURED
      const { data: attempt } = await (supabase.from('payment_attempts') as any)
        .select('status')
        .eq('provider_order_id', orderId)
        .maybeSingle();

      if (attempt && attempt.status !== 'CAPTURED') {
        await (supabase.from('payment_attempts') as any)
          .update({
            status: 'FAILED',
            error_code: paymentEntity?.error_code || 'PAYMENT_FAILED',
            error_description: paymentEntity?.error_description || null,
            updated_at: new Date().toISOString(),
          })
          .eq('provider_order_id', orderId);
      }
    }
  }

  // 4. Record processed webhook in ledger
  try {
    await (supabase.from('payment_webhook_events') as any).insert({
      event_id: eventId,
      event_type: eventType,
      provider_order_id: event?.payload?.qr_code?.entity?.id || event?.payload?.payment?.entity?.order_id || event?.payload?.order?.entity?.id || null,
      provider_payment_id: event?.payload?.payment?.entity?.id || null,
      payload_summary: {
        event: eventType,
        created_at: event?.created_at,
      },
      status: 'PROCESSED',
    });
  } catch {
    // Non-fatal if table missing
  }

  return { success: true };
}

/**
 * Submits a manual UPI payment claim with transaction reference (UTR).
 */
export async function submitManualUpiClaim(
  supabase: DbClient,
  params: {
    magazineId: string;
    utrReference: string;
    notes?: string;
  },
  callerProfile: Profile
): Promise<{ success: boolean; claimId?: string; error?: string }> {
  const { magazineId, utrReference, notes } = params;
  const cleanUtr = utrReference?.trim();

  if (!cleanUtr || cleanUtr.length < 8 || cleanUtr.length > 35) {
    return { success: false, error: 'Please enter a valid UPI transaction reference / UTR number (8-35 characters).' };
  }

  // 1. Fetch magazine and check department ownership
  const { data: magazine, error: magErr } = await (supabase.from('magazines') as any)
    .select('id, department_id, processing_status, page_count')
    .eq('id', magazineId)
    .maybeSingle();

  if (magErr || !magazine) {
    return { success: false, error: 'Magazine not found.' };
  }

  if (callerProfile.role !== 'SUPER_ADMIN' && magazine.department_id !== callerProfile.department_id) {
    return { success: false, error: 'Forbidden: You can only submit payment claims for your department.' };
  }

  // 2. Check if UTR is already used in manual_upi_claims
  let existingUtr: any = null;
  const { data: dbUtr, error: utrErr } = await (supabase.from('manual_upi_claims') as any)
    .select('id')
    .eq('utr_reference', cleanUtr)
    .maybeSingle();

  if (utrErr && isMissingTableError(utrErr) && isRazorpayTestMode()) {
    isolatedSandboxStore.manualClaims.forEach((claim) => {
      if (claim.utr_reference === cleanUtr) {
        existingUtr = claim;
      }
    });
  } else {
    existingUtr = dbUtr;
  }

  if (existingUtr) {
    return { success: false, error: 'This transaction reference (UTR) has already been submitted.' };
  }

  // 3. Get or create obligation
  const currentPlatformFee = await getPlatformFeePaise(supabase);

  let obligation: MagazinePayment;
  let usingSandbox = false;

  const { data: existingObligation, error: oblFetchErr } = await (supabase.from('magazine_payments') as any)
    .select('*')
    .eq('magazine_id', magazineId)
    .in('status', ['PENDING', 'MANUAL_VERIFICATION_PENDING'])
    .maybeSingle();

  if (oblFetchErr && isMissingTableError(oblFetchErr) && isRazorpayTestMode()) {
    usingSandbox = true;
    let sandboxObl = isolatedSandboxStore.obligations.get(magazineId);
    if (!sandboxObl) {
      sandboxObl = {
        id: `obl_sandbox_${magazineId}`,
        magazine_id: magazineId,
        department_id: magazine.department_id,
        amount_paise: currentPlatformFee,
        currency: PAYMENT_CONFIG.CURRENCY,
        status: 'MANUAL_VERIFICATION_PENDING',
        payment_method: 'MANUAL_UPI',
        fee_snapshot_paise: currentPlatformFee,
        paid_at: null,
        verified_by: null,
        verified_at: null,
        rejection_reason: null,
        created_by: callerProfile.id,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      isolatedSandboxStore.obligations.set(magazineId, sandboxObl);
    }
    obligation = sandboxObl;
  } else if (existingObligation) {
    obligation = existingObligation;
  } else {
    const { data: newObligation, error: oblErr } = await (supabase.from('magazine_payments') as any)
      .insert({
        magazine_id: magazineId,
        department_id: magazine.department_id,
        amount_paise: currentPlatformFee,
        currency: PAYMENT_CONFIG.CURRENCY,
        status: 'MANUAL_VERIFICATION_PENDING',
        payment_method: 'MANUAL_UPI',
        fee_snapshot_paise: currentPlatformFee,
        created_by: callerProfile.id,
      })
      .select('*')
      .single();

    if (oblErr && isMissingTableError(oblErr) && isRazorpayTestMode()) {
      usingSandbox = true;
      obligation = {
        id: `obl_sandbox_${magazineId}`,
        magazine_id: magazineId,
        department_id: magazine.department_id,
        amount_paise: currentPlatformFee,
        currency: PAYMENT_CONFIG.CURRENCY,
        status: 'MANUAL_VERIFICATION_PENDING',
        payment_method: 'MANUAL_UPI',
        fee_snapshot_paise: currentPlatformFee,
        paid_at: null,
        verified_by: null,
        verified_at: null,
        rejection_reason: null,
        created_by: callerProfile.id,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      isolatedSandboxStore.obligations.set(magazineId, obligation);
    } else if (oblErr || !newObligation) {
      return { success: false, error: oblErr?.message || 'Failed to initialize payment obligation.' };
    } else {
      obligation = newObligation;
    }
  }

  // 4. Update obligation state to MANUAL_VERIFICATION_PENDING
  obligation.status = 'MANUAL_VERIFICATION_PENDING';
  obligation.payment_method = 'MANUAL_UPI';
  obligation.rejection_reason = null;

  if (usingSandbox) {
    isolatedSandboxStore.obligations.set(magazineId, obligation);
  } else {
    await (supabase.from('magazine_payments') as any)
      .update({
        status: 'MANUAL_VERIFICATION_PENDING',
        payment_method: 'MANUAL_UPI',
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', obligation.id);
  }

  // 5. Insert into manual_upi_claims
  const claimId = `claim_sandbox_${Date.now()}`;
  if (usingSandbox) {
    const claim: any = {
      id: claimId,
      obligation_id: obligation.id,
      magazine_id: magazineId,
      department_id: magazine.department_id,
      utr_reference: cleanUtr,
      amount_paise: obligation.amount_paise,
      submitted_by: callerProfile.id,
      status: 'PENDING',
      notes: notes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    isolatedSandboxStore.manualClaims.set(obligation.id, claim);
    return { success: true, claimId };
  }

  const { data: claim, error: claimErr } = await (supabase.from('manual_upi_claims') as any)
    .insert({
      obligation_id: obligation.id,
      magazine_id: magazineId,
      department_id: magazine.department_id,
      utr_reference: cleanUtr,
      amount_paise: obligation.amount_paise,
      submitted_by: callerProfile.id,
      status: 'PENDING',
      notes: notes?.trim() || null,
    })
    .select('id')
    .single();

  if (claimErr || !claim) {
    return { success: false, error: claimErr?.message || 'Failed to record manual UPI claim.' };
  }

  // 6. Record audit log
  try {
    await (supabase.from('payment_audit_logs') as any).insert({
      event_type: 'MANUAL_UPI_CLAIM_SUBMITTED',
      magazine_id: magazineId,
      obligation_id: obligation.id,
      actor_id: callerProfile.id,
      actor_role: callerProfile.role,
      details: {
        claim_id: claim.id,
        utr_reference: cleanUtr,
        amount_paise: obligation.amount_paise,
      },
    });
  } catch {
    // ignore
  }

  return { success: true, claimId: claim.id };
}

/**
 * Super Admin only: Verifies or rejects a manual UPI payment claim.
 */
export async function verifyManualUpiClaim(
  supabase: DbClient,
  params: {
    claimId: string;
    approved: boolean;
    rejectionReason?: string;
    notes?: string;
  },
  callerProfile: Profile
): Promise<{ success: boolean; error?: string }> {
  if (callerProfile.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Unauthorized: Only Super Administrators can verify manual UPI payments.' };
  }

  const { claimId, approved, rejectionReason, notes } = params;

  // 1. Fetch claim
  const { data: claim, error: claimErr } = await (supabase.from('manual_upi_claims') as any)
    .select('*, obligation:magazine_payments(*)')
    .eq('id', claimId)
    .maybeSingle();

  if (claimErr || !claim) {
    return { success: false, error: 'Manual UPI claim not found.' };
  }

  if (claim.status !== 'PENDING') {
    return { success: false, error: `Claim has already been resolved with status: '${claim.status}'.` };
  }

  const nowIso = new Date().toISOString();

  if (approved) {
    // 2. Mark claim VERIFIED
    await (supabase.from('manual_upi_claims') as any)
      .update({
        status: 'VERIFIED',
        verified_by: callerProfile.id,
        verified_at: nowIso,
        notes: notes?.trim() || claim.notes,
        updated_at: nowIso,
      })
      .eq('id', claimId);

    // 3. Mark obligation PAID
    await (supabase.from('magazine_payments') as any)
      .update({
        status: 'PAID',
        payment_method: 'MANUAL_UPI',
        paid_at: nowIso,
        verified_by: callerProfile.id,
        verified_at: nowIso,
        metadata: {
          manual_upi_claim_id: claimId,
          utr_reference: claim.utr_reference,
        },
        updated_at: nowIso,
      })
      .eq('id', claim.obligation_id);

    // 4. Audit Log
    try {
      await (supabase.from('payment_audit_logs') as any).insert({
        event_type: 'MANUAL_UPI_VERIFIED',
        magazine_id: claim.magazine_id,
        obligation_id: claim.obligation_id,
        actor_id: callerProfile.id,
        actor_role: callerProfile.role,
        details: {
          claim_id: claimId,
          utr_reference: claim.utr_reference,
          amount_paise: claim.amount_paise,
          notes: notes || null,
        },
      });
    } catch {
      // ignore
    }
  } else {
    const cleanReason = rejectionReason?.trim();
    if (!cleanReason) {
      return { success: false, error: 'A rejection reason is required when rejecting a manual UPI claim.' };
    }

    // Mark claim REJECTED
    await (supabase.from('manual_upi_claims') as any)
      .update({
        status: 'REJECTED',
        rejection_reason: cleanReason,
        verified_by: callerProfile.id,
        verified_at: nowIso,
        notes: notes?.trim() || claim.notes,
        updated_at: nowIso,
      })
      .eq('id', claimId);

    // Revert obligation to PENDING
    await (supabase.from('magazine_payments') as any)
      .update({
        status: 'PENDING',
        rejection_reason: cleanReason,
        updated_at: nowIso,
      })
      .eq('id', claim.obligation_id);

    // Audit Log
    try {
      await (supabase.from('payment_audit_logs') as any).insert({
        event_type: 'MANUAL_UPI_REJECTED',
        magazine_id: claim.magazine_id,
        obligation_id: claim.obligation_id,
        actor_id: callerProfile.id,
        actor_role: callerProfile.role,
        details: {
          claim_id: claimId,
          utr_reference: claim.utr_reference,
          rejection_reason: cleanReason,
        },
      });
    } catch {
      // ignore
    }
  }

  return { success: true };
}
