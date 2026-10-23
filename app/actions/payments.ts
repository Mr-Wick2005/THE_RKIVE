'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/utils';
import { PAYMENT_CONFIG } from '@/lib/payments/config';
import {
  getPlatformFeePaise,
  getPlatformFeeDetails,
  updatePlatformFeePaise,
  getMagazinePaymentDetails,
  createOrGetPaymentOrder,
  createOrGetDynamicQr,
  checkQrPaymentStatus,
  simulateTestQrPayment,
  verifyAndConfirmPayment,
  submitManualUpiClaim,
  verifyManualUpiClaim,
} from '@/lib/payments/service';

export interface PaymentActionResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Retrieves the current platform fee and magazine payment status.
 */
export async function getMagazinePaymentDetailsAction(
  magazineId: string,
  token?: string
): Promise<PaymentActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const result = await getMagazinePaymentDetails(supabase, magazineId, profile);
    return {
      success: result.success,
      error: result.error,
      data: {
        obligation: result.obligation,
        manualClaim: result.manualClaim,
        currentFeePaise: result.currentFeePaise,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch payment details.' };
  }
}

/**
 * Initiates or retrieves an existing valid payment order for a magazine.
 */
export async function initiatePaymentOrderAction(
  magazineId: string,
  token?: string
): Promise<PaymentActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const result = await createOrGetPaymentOrder(supabase, magazineId, profile);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to initiate payment order.' };
  }
}

/**
 * Initiates or retrieves an existing valid Dynamic UPI QR payment for a magazine.
 */
export async function initiateDynamicQrAction(
  magazineId: string,
  token?: string
): Promise<PaymentActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const result = await createOrGetDynamicQr(supabase, magazineId, profile);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to initiate dynamic UPI QR.' };
  }
}

/**
 * Checks the status of a dynamic UPI QR payment.
 */
export async function checkQrPaymentStatusAction(
  params: {
    magazineId: string;
    qrId: string;
  },
  token?: string
): Promise<PaymentActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const result = await checkQrPaymentStatus(supabase, params, profile);
    if (result.paid) {
      revalidatePath(`/admin/magazines/${params.magazineId}/edit`);
      revalidatePath('/admin/magazines');
      revalidatePath('/admin/dashboard');
    }

    return {
      success: result.success,
      data: result,
      error: result.error,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to verify QR status.' };
  }
}

/**
 * Simulates a successful UPI QR payment in Razorpay Test Mode only.
 */
export async function simulateTestQrPaymentAction(
  params: {
    magazineId: string;
    qrId: string;
  },
  token?: string
): Promise<PaymentActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const result = await simulateTestQrPayment(supabase, params, profile);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath(`/admin/magazines/${params.magazineId}/edit`);
    revalidatePath('/admin/magazines');
    revalidatePath('/admin/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to simulate test QR payment.' };
  }
}

/**
 * Verifies Razorpay checkout signature and updates obligation to PAID.
 */
export async function verifyPaymentAction(
  params: {
    magazineId: string;
    orderId: string;
    paymentId: string;
    signature: string;
  },
  token?: string
): Promise<PaymentActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const result = await verifyAndConfirmPayment(supabase, params, profile);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath(`/admin/magazines/${params.magazineId}/edit`);
    revalidatePath('/admin/magazines');
    revalidatePath('/admin/dashboard');

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Payment verification encountered an unexpected error.' };
  }
}

/**
 * Submits a manual UPI payment claim with transaction reference (UTR).
 */
export async function submitManualUpiClaimAction(
  params: {
    magazineId: string;
    utrReference: string;
    notes?: string;
  },
  token?: string
): Promise<PaymentActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || !profile.is_active) {
      return { success: false, error: 'Unauthorized: Active administrative profile required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const result = await submitManualUpiClaim(supabase, params, profile);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath(`/admin/magazines/${params.magazineId}/edit`);
    revalidatePath('/admin/magazines');
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/review');

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit manual UPI claim.' };
  }
}

/**
 * Super Admin only: Verifies or rejects a manual UPI payment claim.
 */
export async function verifyManualUpiClaimAction(
  params: {
    claimId: string;
    approved: boolean;
    rejectionReason?: string;
    notes?: string;
    magazineId?: string;
  },
  token?: string
): Promise<PaymentActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || profile.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Super Admin permissions required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const result = await verifyManualUpiClaim(supabase, params, profile);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (params.magazineId) {
      revalidatePath(`/admin/magazines/${params.magazineId}/edit`);
      revalidatePath(`/admin/review/${params.magazineId}`);
    }
    revalidatePath('/admin/review');
    revalidatePath('/admin/magazines');
    revalidatePath('/admin/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resolve manual UPI claim.' };
  }
}

/**
 * Super Admin only: Updates platform submission fee.
 */
export async function updatePlatformFeeAction(
  newFeePaise: number,
  reason?: string,
  token?: string
): Promise<PaymentActionResult> {
  try {
    const profile = await getCurrentProfile(token);
    if (!profile || profile.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Unauthorized: Super Admin permissions required.' };
    }

    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase is not configured.' };
    const supabase = createAdminClient();

    const result = await updatePlatformFeePaise(supabase, profile, newFeePaise, reason);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update platform fee.' };
  }
}

/**
 * Retrieves platform fee configuration and persistence status.
 * Fails clearly if persistent storage in public.platform_settings is unavailable.
 */
export async function getPlatformFeeAction(): Promise<{
  success: boolean;
  feePaise: number;
  isPersistent: boolean;
  currency: string;
  error?: string;
  updatedAt?: string;
}> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        feePaise: PAYMENT_CONFIG.DEFAULT_SUBMISSION_FEE_PAISE,
        isPersistent: false,
        currency: PAYMENT_CONFIG.CURRENCY,
        error: 'Database connection is not configured.',
      };
    }
    const supabase = createAdminClient();
    const details = await getPlatformFeeDetails(supabase);
    return details;
  } catch (err: any) {
    return {
      success: false,
      feePaise: PAYMENT_CONFIG.DEFAULT_SUBMISSION_FEE_PAISE,
      isPersistent: false,
      currency: PAYMENT_CONFIG.CURRENCY,
      error: err.message || 'Failed to read platform fee configuration.',
    };
  }
}
