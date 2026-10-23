/**
 * THE RKIVE — Payment System Configuration & Guardrails
 *
 * Single source of truth for:
 * 1. Default platform submission fee (₹20 = 2,000 paise)
 * 2. Permitted fee bounds (₹1 to ₹1,000)
 * 3. Currency and precision validation
 * 4. Environment variable names
 */

export const PAYMENT_CONFIG = {
  // Default submission fee in paise: ₹20.00
  DEFAULT_SUBMISSION_FEE_PAISE: 2000,

  // Bounded fee limits to prevent arithmetic corruption or excessive fees
  MIN_SUBMISSION_FEE_PAISE: 100, // ₹1.00
  MAX_SUBMISSION_FEE_PAISE: 100_000, // ₹1,000.00

  // Standard platform currency
  CURRENCY: 'INR',

  // Order expiry window in seconds (Razorpay default allows payment within valid window)
  ORDER_EXPIRY_SECONDS: 3600, // 1 hour

  // Razorpay Environment Variable Keys
  ENV_KEYS: {
    KEY_ID: 'RAZORPAY_KEY_ID',
    KEY_SECRET: 'RAZORPAY_KEY_SECRET',
    PUBLIC_KEY_ID: 'NEXT_PUBLIC_RAZORPAY_KEY_ID',
    WEBHOOK_SECRET: 'RAZORPAY_WEBHOOK_SECRET',
  },
} as const;

/**
 * Validates a candidate platform fee in paise
 */
export function validateFeePaise(feePaise: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(feePaise)) {
    return { valid: false, error: 'Fee must be an integer amount in paise (no fractional paise).' };
  }
  if (feePaise < PAYMENT_CONFIG.MIN_SUBMISSION_FEE_PAISE) {
    const minRupees = PAYMENT_CONFIG.MIN_SUBMISSION_FEE_PAISE / 100;
    return { valid: false, error: `Fee must be at least ₹${minRupees} (${PAYMENT_CONFIG.MIN_SUBMISSION_FEE_PAISE} paise).` };
  }
  if (feePaise > PAYMENT_CONFIG.MAX_SUBMISSION_FEE_PAISE) {
    const maxRupees = PAYMENT_CONFIG.MAX_SUBMISSION_FEE_PAISE / 100;
    return { valid: false, error: `Fee cannot exceed ₹${maxRupees} (${PAYMENT_CONFIG.MAX_SUBMISSION_FEE_PAISE} paise).` };
  }
  return { valid: true };
}

/**
 * Formats paise to standard Indian Rupees display string (e.g. 2000 -> "₹20")
 */
export function formatPaiseToRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(rupees);
}

/**
 * Formats paise to standard Indian Rupees display string with exact 2 decimal places (e.g. 2000 -> "₹20.00")
 */
export function formatPaiseToInr(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

