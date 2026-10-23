import { Profile } from './auth';
import { Department } from './department';
import { Magazine } from './magazine';

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'MANUAL_VERIFICATION_PENDING'
  | 'REFUNDED'
  | 'EXEMPT';

export type PaymentMethodType =
  | 'RAZORPAY'
  | 'RAZORPAY_QR'
  | 'MANUAL_UPI'
  | 'INSTITUTIONAL_EXEMPTION';

export interface PlatformSettings {
  key: string;
  value_paise: number;
  currency: string;
  is_active: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformFeeAuditLog {
  id: string;
  previous_fee_paise: number;
  new_fee_paise: number;
  changed_by: string | null;
  change_reason: string | null;
  created_at: string;
  changer?: Profile;
}

export interface MagazinePayment {
  id: string;
  magazine_id: string;
  department_id: string;
  amount_paise: number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethodType;
  fee_snapshot_paise: number;
  paid_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  metadata: Record<string, any>;
  provider_order_id?: string | null;
  provider_payment_id?: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations
  magazine?: Magazine;
  department?: Department;
  creator?: Profile;
  verifier?: Profile;
}

export interface PaymentAttempt {
  id: string;
  obligation_id: string;
  magazine_id: string;
  provider: 'RAZORPAY';
  provider_order_id: string;
  provider_payment_id: string | null;
  provider_signature: string | null;
  amount_paise: number;
  currency: string;
  status: 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED';
  error_code: string | null;
  error_description: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManualUpiClaim {
  id: string;
  obligation_id: string;
  magazine_id: string;
  department_id: string;
  utr_reference: string;
  amount_paise: number;
  submitted_by: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  submitter?: Profile;
  verifier?: Profile;
}

export interface PaymentWebhookEvent {
  id: string;
  event_id: string;
  event_type: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  payload_summary: Record<string, any>;
  status: string;
  processed_at: string;
}

export interface PaymentAuditLog {
  id: string;
  event_type: string;
  magazine_id: string | null;
  obligation_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  details: Record<string, any>;
  created_at: string;
  actor?: Profile;
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  amountPaise?: number;
  currency?: string;
  keyId?: string;
  obligationId?: string;
  error?: string;
  isAlreadyPaid?: boolean;
}

export interface PaymentVerificationResult {
  success: boolean;
  magazineId?: string;
  obligationId?: string;
  paymentId?: string;
  status?: PaymentStatus;
  error?: string;
}

export interface CreateDynamicQrResult {
  success: boolean;
  qrId?: string;
  imageUrl?: string;
  amountPaise?: number;
  currency?: string;
  closeBy?: number;
  obligationId?: string;
  status?: string;
  isAlreadyPaid?: boolean;
  isTestMode?: boolean;
  error?: string;
}

export interface QrPaymentStatusResult {
  success: boolean;
  paid: boolean;
  status?: PaymentStatus;
  paymentId?: string;
  error?: string;
}

