'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PAYMENT_CONFIG, formatPaiseToRupees } from '@/lib/payments/config';
import {
  initiatePaymentOrderAction,
  initiateDynamicQrAction,
  checkQrPaymentStatusAction,
  verifyPaymentAction,
  getMagazinePaymentDetailsAction,
} from '@/app/actions/payments';
import {
  ShieldCheck,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Building2,
  QrCode,
  CreditCard,
  Smartphone,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

// Declare Razorpay on the window object for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  magazineId: string;
  magazineTitle: string;
  departmentName?: string;
  feePaise: number;
  initialStatus?: string;
  existingUtr?: string;
  onPaymentSuccess: () => void;
}

type PaymentMode = 'checkout' | 'qr';
type ModalStep = 'payment' | 'verifying' | 'success';

interface SuccessDetails {
  paymentId?: string;
  amountPaise: number;
  paymentMethod: string;
  timestamp: string;
}

export function PaymentModal({
  isOpen,
  onClose,
  magazineId,
  magazineTitle,
  departmentName,
  feePaise,
  initialStatus,
  existingUtr,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [modalStep, setModalStep] = useState<ModalStep>('payment');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('checkout');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingManual, setIsCheckingManual] = useState(false);
  const [successDetails, setSuccessDetails] = useState<SuccessDetails | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(3);

  // Razorpay Checkout States
  const [isRazorpayScriptLoaded, setIsRazorpayScriptLoaded] = useState(false);

  // Dynamic UPI QR States
  const [qrData, setQrData] = useState<{
    qrId: string;
    imageUrl: string;
    amountPaise: number;
    closeBy: number;
    isTestMode?: boolean;
  } | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [qrSecondsRemaining, setQrSecondsRemaining] = useState<number>(1800);

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: get Supabase session token
  const getActiveToken = useCallback(async (): Promise<string | undefined> => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token;
    } catch {
      return undefined;
    }
  }, []);

  // Trigger the animated success screen and countdown
  const triggerSuccessScreen = useCallback(
    (details: { paymentId?: string; amountPaise: number; paymentMethod: string }) => {
      // Clear background timers
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

      setSuccessDetails({
        paymentId: details.paymentId,
        amountPaise: details.amountPaise,
        paymentMethod: details.paymentMethod,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
      setModalStep('success');
      setRedirectCountdown(3);
    },
    []
  );

  // Handle proceeding after payment success
  const handleProceedToSubmit = useCallback(() => {
    if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    onPaymentSuccess();
  }, [onPaymentSuccess]);

  // Countdown auto-advance on success screen
  useEffect(() => {
    if (modalStep === 'success') {
      redirectTimerRef.current = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
            handleProceedToSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
      };
    }
  }, [modalStep, handleProceedToSubmit]);

  // Load Razorpay Checkout SDK script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const existingScript = document.getElementById('razorpay-checkout-script');
      if (existingScript) {
        setIsRazorpayScriptLoaded(true);
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setIsRazorpayScriptLoaded(true);
      script.onerror = () => {
        console.error('[PaymentModal] Failed to load Razorpay Checkout SDK');
        setErrorMessage('Failed to load payment gateway. Please refresh and try again.');
      };
      document.head.appendChild(script);
    } else if (typeof window !== 'undefined' && window.Razorpay) {
      setIsRazorpayScriptLoaded(true);
    }
  }, []);

  // Format countdown mm:ss
  const formatCountdown = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return '00:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RAZORPAY CHECKOUT MODE — Standard payment modal (Cards, UPI, Netbanking)
  // ═══════════════════════════════════════════════════════════════════════════
  const handleRazorpayCheckout = useCallback(async () => {
    if (!magazineId || !isRazorpayScriptLoaded) {
      setErrorMessage('Payment gateway is still loading. Please wait a moment.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const token = await getActiveToken();
      const res = await initiatePaymentOrderAction(magazineId, token);

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to create payment order.');
      }

      if (res.data.isAlreadyPaid) {
        triggerSuccessScreen({
          paymentId: res.data.paymentId || 'PREVIOUSLY_VERIFIED',
          amountPaise: res.data.amountPaise || feePaise,
          paymentMethod: 'Verified Payment',
        });
        setIsProcessing(false);
        return;
      }

      const { orderId, amountPaise, currency, keyId } = res.data;

      if (!orderId || !keyId) {
        throw new Error('Missing payment order details from server.');
      }

      // Open Razorpay Checkout modal
      const options = {
        key: keyId,
        amount: amountPaise,
        currency: currency || 'INR',
        name: 'The Rkive',
        description: `Submission Fee: ${magazineTitle.slice(0, 30)}`,
        order_id: orderId,
        handler: async function (response: any) {
          // Payment succeeded on Razorpay side — verify on server
          try {
            setModalStep('verifying');
            setIsProcessing(true);
            setErrorMessage(null);

            const verifyToken = await getActiveToken();
            const verifyRes = await verifyPaymentAction(
              {
                magazineId,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
              verifyToken
            );

            if (!verifyRes.success) {
              throw new Error(verifyRes.error || 'Payment verification failed on server.');
            }

            // Trigger animated success confirmation
            triggerSuccessScreen({
              paymentId: response.razorpay_payment_id,
              amountPaise,
              paymentMethod: 'Online Payment (Razorpay)',
            });
          } catch (verifyErr: any) {
            console.error('[PaymentModal] Verification error:', verifyErr);
            setModalStep('payment');
            setErrorMessage(
              verifyErr.message || 'Payment was received but verification failed. Contact support.'
            );
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: departmentName || 'Department Admin',
        },
        notes: {
          magazine_id: magazineId,
          purpose: 'submission_fee',
        },
        theme: {
          color: '#171717',
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setErrorMessage('Payment was cancelled. You can try again anytime.');
          },
          escape: true,
          animation: true,
          backdropclose: false,
          confirm_close: true,
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (response: any) {
        console.error('[PaymentModal] Payment failed:', response.error);
        setErrorMessage(
          `Payment failed: ${response.error?.description || response.error?.reason || 'Unknown error'}. Please try again.`
        );
        setIsProcessing(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error('[PaymentModal] Checkout error:', err);
      setErrorMessage(err.message || 'Could not initiate payment. Please try again.');
      setIsProcessing(false);
    }
  }, [
    magazineId,
    isRazorpayScriptLoaded,
    getActiveToken,
    magazineTitle,
    departmentName,
    feePaise,
    triggerSuccessScreen,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DYNAMIC UPI QR MODE
  // ═══════════════════════════════════════════════════════════════════════════
  const loadDynamicQr = useCallback(async () => {
    if (!magazineId) return;
    setIsLoadingQr(true);
    setErrorMessage(null);

    try {
      const token = await getActiveToken();
      const res = await initiateDynamicQrAction(magazineId, token);

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to generate dynamic UPI QR code.');
      }

      if (res.data.isAlreadyPaid) {
        triggerSuccessScreen({
          paymentId: res.data.paymentId || 'PREVIOUSLY_VERIFIED',
          amountPaise: res.data.amountPaise || feePaise,
          paymentMethod: 'UPI Verified',
        });
        return;
      }

      const { qrId, imageUrl, amountPaise, closeBy, isTestMode } = res.data;
      setQrData({ qrId, imageUrl, amountPaise, closeBy, isTestMode });

      const nowUnix = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, (closeBy || nowUnix + 1800) - nowUnix);
      setQrSecondsRemaining(remaining);
    } catch (err: any) {
      console.error('[PaymentModal] Error generating QR:', err);
      setErrorMessage(err.message || 'Could not generate dynamic UPI QR.');
    } finally {
      setIsLoadingQr(false);
    }
  }, [magazineId, getActiveToken, feePaise, triggerSuccessScreen]);

  // Load QR when switching to QR mode
  useEffect(() => {
    if (isOpen && paymentMode === 'qr' && !qrData && !isLoadingQr && modalStep === 'payment') {
      loadDynamicQr();
    }
  }, [isOpen, paymentMode, qrData, isLoadingQr, modalStep, loadDynamicQr]);

  // Keyboard shortcut: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && modalStep !== 'verifying') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, modalStep, onClose]);

  // Countdown timer effect for active QR code
  useEffect(() => {
    if (!isOpen || !qrData || paymentMode !== 'qr' || modalStep !== 'payment') return;

    countdownTimerRef.current = setInterval(() => {
      setQrSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isOpen, qrData, paymentMode, modalStep]);

  // Verification Checker: shared between auto-polling and manual button click
  const checkPaymentCompletion = useCallback(async () => {
    try {
      const token = await getActiveToken();

      // 1. Check via QR status action if we have active qrData
      if (qrData?.qrId) {
        const qrRes = await checkQrPaymentStatusAction(
          { magazineId, qrId: qrData.qrId },
          token
        );
        if (qrRes.success && qrRes.data?.paid) {
          triggerSuccessScreen({
            paymentId: qrRes.data?.paymentId || qrData.qrId,
            amountPaise: qrData.amountPaise || feePaise,
            paymentMethod: 'Dynamic UPI QR',
          });
          return true;
        }
      }

      // 2. Direct database obligation status check (catches webhook confirmations & concurrent verifies)
      const detailsRes = await getMagazinePaymentDetailsAction(magazineId, token);
      if (detailsRes.success && (detailsRes.data?.isPaid || detailsRes.data?.obligation?.status === 'PAID')) {
        const obl = detailsRes.data?.obligation;
        triggerSuccessScreen({
          paymentId: obl?.metadata?.razorpay_payment_id || obl?.id,
          amountPaise: obl?.amount_paise || feePaise,
          paymentMethod: obl?.payment_method === 'RAZORPAY_QR' ? 'Dynamic UPI QR' : 'Online Payment',
        });
        return true;
      }

      return false;
    } catch (err) {
      console.warn('[PaymentModal] Status check error:', err);
      return false;
    }
  }, [getActiveToken, qrData, magazineId, feePaise, triggerSuccessScreen]);

  // QR Polling effect: Check payment status every 2.5 seconds
  useEffect(() => {
    if (!isOpen || !qrData || qrSecondsRemaining <= 0 || paymentMode !== 'qr' || modalStep !== 'payment') {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      return;
    }

    pollingTimerRef.current = setInterval(checkPaymentCompletion, 2500);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [isOpen, qrData, qrSecondsRemaining, paymentMode, modalStep, checkPaymentCompletion]);

  // Manual "Verify Now" button handler
  const handleManualVerifyClick = async () => {
    setIsCheckingManual(true);
    setErrorMessage(null);
    try {
      const isPaid = await checkPaymentCompletion();
      if (!isPaid) {
        setErrorMessage('Payment not yet detected by bank. If you just approved in your UPI app, please wait 3-5 seconds and click verify again.');
      }
    } finally {
      setIsCheckingManual(false);
    }
  };

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
      setErrorMessage(null);
      setQrData(null);
      setIsProcessing(false);
      setIsCheckingManual(false);
      setModalStep('payment');
      setSuccessDetails(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentFee = qrData?.amountPaise || feePaise || PAYMENT_CONFIG.DEFAULT_SUBMISSION_FEE_PAISE;
  const isExpired = paymentMode === 'qr' && qrSecondsRemaining <= 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-xl md:max-w-3xl lg:max-w-4xl bg-stone-950 border border-stone-800/90 text-stone-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-amber-500/10 my-auto">
        {/* Top-Right Dismiss Button (disabled during verifying step) */}
        {modalStep !== 'verifying' && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment modal"
            className="absolute top-3.5 right-3.5 z-20 p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* ================================================================= */}
          {/* STEP 1: ANIMATED SUCCESS CONFIRMATION SCREEN                       */}
          {/* ================================================================= */}
          {modalStep === 'success' ? (
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="p-6 sm:p-8 md:p-10 flex flex-col items-center text-center relative overflow-hidden bg-gradient-to-b from-emerald-950/30 via-stone-950 to-stone-950"
            >
              {/* Decorative Ambient Aura */}
              <div
                className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"
                aria-hidden="true"
              />

              {/* Animated Checkmark with Ripple Rings */}
              <div className="relative mb-6">
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full bg-emerald-500/25 blur-sm"
                />
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 220 }}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-500/30 ring-4 ring-emerald-500/30"
                >
                  <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-stone-950 stroke-[2.5]" />
                </motion.div>
              </div>

              {/* Celebration Badges & Headings */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Payment Confirmed & Verified</span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl font-semibold text-stone-100 tracking-tight mt-1">
                Payment Successful!
              </h3>
              <p className="text-sm sm:text-base text-stone-300 max-w-md mx-auto mt-2 leading-relaxed">
                Your one-time publication fee has been verified. Submission access is now unlocked.
              </p>

              {/* Receipt Summary Card */}
              <div className="w-full max-w-md my-6 p-4 sm:p-5 rounded-2xl bg-stone-900/80 border border-emerald-500/20 backdrop-blur-sm text-left shadow-lg space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 block">
                      Amount Paid
                    </span>
                    <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
                      {formatPaiseToRupees(successDetails?.amountPaise || currentFee)}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold tracking-wider">
                    PAID ✓
                  </span>
                </div>

                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between text-stone-300">
                    <span className="text-stone-400">Publication:</span>
                    <span className="font-medium text-stone-200 text-right truncate max-w-[220px]" title={magazineTitle}>
                      {magazineTitle}
                    </span>
                  </div>
                  {departmentName && (
                    <div className="flex justify-between text-stone-300">
                      <span className="text-stone-400">Department:</span>
                      <span className="font-medium text-stone-200 text-right truncate max-w-[220px]">
                        {departmentName}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-300">
                    <span className="text-stone-400">Method:</span>
                    <span className="font-medium text-stone-200">{successDetails?.paymentMethod || 'Razorpay UPI'}</span>
                  </div>
                  {successDetails?.paymentId && (
                    <div className="flex justify-between text-stone-300">
                      <span className="text-stone-400">Reference:</span>
                      <span className="font-mono text-xs text-amber-300/90">{successDetails.paymentId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar & Auto-redirect indicator */}
              <div className="w-full max-w-md space-y-2 mb-6">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    Opening submission confirmation...
                  </span>
                  <span className="font-mono font-medium text-emerald-400">{redirectCountdown}s</span>
                </div>
                <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, ease: 'linear' }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  />
                </div>
              </div>

              {/* Call to Action Button */}
              <Button
                type="button"
                onClick={handleProceedToSubmit}
                className="h-12 px-8 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold text-base rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2.5 transition-all group"
              >
                <span>Proceed to Submit Publication</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          ) : modalStep === 'verifying' ? (
            /* ================================================================= */
            /* STEP 2: VERIFYING INTERMEDIATE SCREEN                             */
            /* ================================================================= */
            <motion.div
              key="verifying-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[420px]"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
              </div>
              <h4 className="font-serif text-xl sm:text-2xl font-medium text-stone-100">
                Verifying Transaction...
              </h4>
              <p className="text-sm text-stone-400 max-w-sm">
                Confirming settlement with Razorpay and updating publication status. Please do not close this window.
              </p>
            </motion.div>
          ) : (
            /* ================================================================= */
            /* STEP 3: PAYMENT SCREEN (DUAL COLUMN: CHECKOUT & DYNAMIC QR)       */
            /* ================================================================= */
            <div className="flex flex-col md:flex-row flex-1">
              {/* ================= LEFT COLUMN ================= */}
              <div className="w-full md:w-1/2 flex flex-col justify-between p-5 sm:p-6 md:p-7 md:border-r border-stone-800/80 space-y-4">
                <div className="space-y-4">
                  {/* Header Title & Subtitle */}
                  <div className="pr-8">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono tracking-wider uppercase font-medium mb-2">
                      <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                      <span>Editorial Verification</span>
                    </div>
                    <h3 id="payment-modal-title" className="font-serif text-2xl sm:text-3xl font-medium text-stone-100 tracking-tight leading-snug">
                      Submission Fee
                    </h3>
                    <p className="text-sm text-stone-300 mt-1">
                      The Rkive Editorial Desk • Publication Processing
                    </p>
                  </div>

                  {/* Publication Details Card */}
                  <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-800/80 space-y-2">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-amber-400/90 font-medium block">
                        Publication
                      </span>
                      <h4 className="font-serif text-base sm:text-lg font-medium text-stone-100 truncate mt-0.5" title={magazineTitle}>
                        {magazineTitle}
                      </h4>
                    </div>
                    {departmentName && (
                      <div className="flex items-center gap-2 text-sm text-stone-300 pt-2 border-t border-stone-800/50 truncate">
                        <Building2 className="w-4 h-4 text-stone-400 shrink-0" />
                        <span className="truncate">{departmentName}</span>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Fee Card */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/20">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-stone-300 block font-medium">
                        Fixed Fee Due
                      </span>
                      <span className="text-xs sm:text-[13px] text-stone-400">One-time submission charge</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-300 tracking-tight">
                      {formatPaiseToRupees(currentFee)}
                    </div>
                  </div>

                  {/* Payment Mode Selector */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('checkout')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                        paymentMode === 'checkout'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : 'bg-stone-900/40 border-stone-800/60 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Online</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('qr')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                        paymentMode === 'qr'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : 'bg-stone-900/40 border-stone-800/60 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Scan QR</span>
                    </button>
                  </div>

                  {/* Status & Alerts */}
                  <div className="space-y-2">
                    {paymentMode === 'qr' && qrData && !isExpired && (
                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-stone-900/90 border border-stone-800/80 text-sm">
                        <div className="flex items-center gap-2 text-stone-300">
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-stone-200">Awaiting UPI confirmation...</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-mono font-semibold text-amber-300 shrink-0">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>{formatCountdown(qrSecondsRemaining)}</span>
                        </div>
                      </div>
                    )}

                    {paymentMode === 'qr' && isExpired && (
                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium">QR Expired</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => { setQrData(null); loadDynamicQr(); }}
                          className="h-7 px-3 text-xs bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium rounded flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Regenerate</span>
                        </Button>
                      </div>
                    )}

                    {/* Manual Verification Note */}
                    {initialStatus === 'MANUAL_VERIFICATION_PENDING' && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-center gap-2">
                        <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                        <span className="truncate">
                          Manual claim pending {existingUtr ? `(UTR: ${existingUtr})` : ''}.
                        </span>
                      </div>
                    )}

                    {/* Error Alert */}
                    {errorMessage && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        <span className="leading-snug">{errorMessage}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Instructions */}
                  <div className="pt-0.5">
                    <span className="text-xs font-mono uppercase tracking-wider text-stone-300 block mb-1.5 font-medium">
                      {paymentMode === 'checkout' ? 'How It Works' : 'UPI Instructions'}
                    </span>
                    {paymentMode === 'checkout' ? (
                      <ol className="text-xs sm:text-sm text-stone-300 space-y-1 list-decimal list-inside pl-0.5 leading-relaxed">
                        <li>Click &ldquo;Pay Now&rdquo; to open the secure payment window.</li>
                        <li>Choose UPI, Card, or Netbanking to complete payment.</li>
                        <li>Verification completes automatically after payment.</li>
                      </ol>
                    ) : (
                      <ol className="text-xs sm:text-sm text-stone-300 space-y-1 list-decimal list-inside pl-0.5 leading-relaxed">
                        <li>Open Google Pay, PhonePe, Paytm, or BHIM.</li>
                        <li>Scan the dynamic QR code on the right.</li>
                        <li>Approve payment; verification completes automatically.</li>
                      </ol>
                    )}
                  </div>
                </div>
              </div>

              {/* ================= RIGHT COLUMN ================= */}
              <div className="w-full md:w-1/2 flex flex-col p-3 sm:p-4 bg-stone-900/20 relative min-h-[360px] sm:min-h-[420px] md:min-h-0">
                {paymentMode === 'checkout' ? (
                  /* Razorpay Checkout Mode */
                  <div className="w-full h-full flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Smartphone className="w-10 h-10 text-amber-400" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-serif font-medium text-stone-100">
                        Secure Payment Gateway
                      </h4>
                      <p className="text-sm text-stone-400 max-w-xs mx-auto">
                        Pay via UPI, Debit/Credit Card, or Net Banking through Razorpay&apos;s secure checkout.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleRazorpayCheckout}
                      disabled={isProcessing || !isRazorpayScriptLoaded}
                      className="h-12 px-8 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-base rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          <span>Pay {formatPaiseToRupees(currentFee)} Now</span>
                        </>
                      )}
                    </Button>
                    {!isRazorpayScriptLoaded && (
                      <p className="text-xs text-stone-500 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Loading payment gateway...
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-stone-500 pt-2">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> 256-bit SSL
                      </span>
                      <span>•</span>
                      <span>PCI DSS Compliant</span>
                      <span>•</span>
                      <span>RBI Regulated</span>
                    </div>
                  </div>
                ) : (
                  /* QR Code Mode */
                  <div className="w-full h-full flex-1 flex flex-col items-center justify-between gap-3">
                    {isLoadingQr ? (
                      <div className="w-full h-full flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center rounded-xl bg-stone-900/60 border border-stone-800/80 min-h-[340px]">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                        <p className="text-sm text-stone-200 font-medium">Generating Dynamic UPI QR...</p>
                        <p className="text-xs text-stone-400">Creating Razorpay payment request</p>
                      </div>
                    ) : qrData ? (
                      <div className="w-full flex-1 flex flex-col items-center justify-center relative min-h-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrData.imageUrl}
                          alt="Razorpay Dynamic UPI QR"
                          className={`w-full max-h-[360px] object-contain rounded-xl select-none transition-all duration-200 drop-shadow-2xl ${
                            isExpired ? 'opacity-25 grayscale' : 'opacity-100'
                          }`}
                        />
                        {/* Expiration Overlay */}
                        {isExpired && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-stone-950/85 backdrop-blur-sm rounded-xl text-center space-y-3 animate-in fade-in duration-150">
                            <Clock className="w-8 h-8 text-rose-400" />
                            <div>
                              <p className="text-base font-semibold text-stone-100">QR Code Expired</p>
                              <p className="text-xs text-stone-400 mt-0.5">Session expired for payment security</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => { setQrData(null); loadDynamicQr(); }}
                              className="h-8 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium text-xs rounded-lg flex items-center gap-1.5 shadow-lg"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Regenerate QR Code</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full flex-1 flex flex-col items-center justify-center py-8 text-center space-y-3 min-h-[340px]">
                        <p className="text-sm text-stone-300">Unable to load Dynamic UPI QR code.</p>
                        <Button
                          type="button"
                          onClick={loadDynamicQr}
                          className="bg-amber-600 hover:bg-amber-500 text-stone-950 text-sm py-2 px-4 rounded-lg font-medium"
                        >
                          Retry Loading
                        </Button>
                      </div>
                    )}

                    {/* Manual "I have paid" confirmation button */}
                    {qrData && !isExpired && (
                      <div className="w-full pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleManualVerifyClick}
                          disabled={isCheckingManual}
                          className="w-full h-10 border-stone-800 bg-stone-900/60 hover:bg-stone-800 text-stone-200 hover:text-amber-300 text-xs sm:text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                          {isCheckingManual ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                              <span>Checking payment status with bank...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                              <span>Paid via UPI? Check Status Now</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Security Footer (only visible in payment step) */}
        {modalStep === 'payment' && (
          <div className="px-5 sm:px-6 py-3 border-t border-stone-800/80 bg-stone-900/40 flex items-center justify-between text-xs text-stone-300">
            <div className="flex items-center gap-2 text-stone-300">
              <ShieldCheck className="w-4 h-4 text-amber-400/90" />
              <span>Encrypted • Verified by Razorpay • Secure Payment</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="hover:text-stone-100 transition-colors focus:outline-none focus:underline"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
