'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PAYMENT_CONFIG, formatPaiseToRupees } from '@/lib/payments/config';
import {
  initiatePaymentOrderAction,
  initiateDynamicQrAction,
  checkQrPaymentStatusAction,
  verifyPaymentAction,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('checkout');
  const [isProcessing, setIsProcessing] = useState(false);

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
        setSuccessMessage('This publication already has a verified payment. Redirecting...');
        setTimeout(() => {
          onPaymentSuccess();
          onClose();
        }, 1200);
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

            setSuccessMessage('Payment Verified! Your publication submission fee has been confirmed.');
            setTimeout(() => {
              onPaymentSuccess();
              onClose();
            }, 1500);
          } catch (verifyErr: any) {
            console.error('[PaymentModal] Verification error:', verifyErr);
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
  }, [magazineId, isRazorpayScriptLoaded, getActiveToken, magazineTitle, departmentName, onPaymentSuccess, onClose]);

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
        setSuccessMessage('This publication already has a verified payment obligation.');
        setTimeout(() => {
          onPaymentSuccess();
          onClose();
        }, 1200);
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
  }, [magazineId, getActiveToken, onPaymentSuccess, onClose]);

  // Load QR when switching to QR mode
  useEffect(() => {
    if (isOpen && paymentMode === 'qr' && !qrData && !isLoadingQr) {
      loadDynamicQr();
    }
  }, [isOpen, paymentMode, qrData, isLoadingQr, loadDynamicQr]);

  // Keyboard shortcut: Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || !qrData || paymentMode !== 'qr') return;

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
  }, [isOpen, qrData, paymentMode]);

  // QR Polling effect: Check payment status every 4 seconds
  useEffect(() => {
    if (!isOpen || !qrData || qrSecondsRemaining <= 0 || paymentMode !== 'qr') {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      return;
    }

    const pollStatus = async () => {
      try {
        const token = await getActiveToken();
        const res = await checkQrPaymentStatusAction(
          { magazineId, qrId: qrData.qrId },
          token
        );

        if (res.success && res.data?.paid) {
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
          setSuccessMessage('Payment Confirmed! Your publication has been verified.');
          setTimeout(() => {
            onPaymentSuccess();
            onClose();
          }, 1400);
        }
      } catch (pollErr) {
        console.warn('[PaymentModal] Polling error:', pollErr);
      }
    };

    pollingTimerRef.current = setInterval(pollStatus, 4000);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [isOpen, qrData, qrSecondsRemaining, paymentMode, magazineId, getActiveToken, onPaymentSuccess, onClose]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setErrorMessage(null);
      setSuccessMessage(null);
      setQrData(null);
      setIsProcessing(false);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-xl md:max-w-3xl lg:max-w-4xl bg-stone-950 border border-stone-800/90 text-stone-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-amber-500/10 my-auto">
        {/* Top-Right Dismiss Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close payment modal"
          className="absolute top-3.5 right-3.5 z-20 p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Two-Column Landscape Grid */}
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

                {/* Success Alert */}
                {successMessage && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <span className="leading-snug">{successMessage}</span>
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
                  disabled={isProcessing || !isRazorpayScriptLoaded || !!successMessage}
                  className="h-12 px-8 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-base rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
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
              <>
                {isLoadingQr ? (
                  <div className="w-full h-full flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center rounded-xl bg-stone-900/60 border border-stone-800/80 min-h-[340px]">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                    <p className="text-sm text-stone-200 font-medium">Generating Dynamic UPI QR...</p>
                    <p className="text-xs text-stone-400">Creating Razorpay payment request</p>
                  </div>
                ) : qrData ? (
                  <div className="w-full h-full flex-1 flex items-center justify-center relative min-h-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrData.imageUrl}
                      alt="Razorpay Dynamic UPI QR"
                      className={`w-full h-full object-contain rounded-xl select-none transition-all duration-200 drop-shadow-2xl ${
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
              </>
            )}
          </div>
        </div>

        {/* Security Footer */}
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
      </div>
    </div>
  );
}
