'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MagazineWithRelations,
  MAGAZINE_STATUS_LABELS,
  MAGAZINE_STATUS_COLORS,
} from '@/types/magazine';
import {
  approveMagazineAction,
  rejectMagazineAction,
  publishMagazineAction,
  archiveMagazineAction,
  startReviewMagazineAction,
} from '@/app/actions/magazines';
import {
  getMagazinePaymentDetailsAction,
  verifyManualUpiClaimAction,
} from '@/app/actions/payments';
import { formatPaiseToInr } from '@/lib/payments/config';
import { MagazinePayment, ManualUpiClaim } from '@/types/payment';
import { PublicationStatusBadge } from '@/components/admin/publication-status-badge';
import { ProcessingStatusBadge } from '@/components/admin/processing-status-badge';
import { StatusHistoryTimeline } from '@/components/admin/status-history-timeline';
import { RejectionModal } from '@/components/admin/rejection-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  Globe,
  Archive,
  BookOpen,
  ArrowLeft,
  Building2,
  User,
  Calendar,
  Layers,
  FileText,
  Clock,
  AlertCircle,
  ExternalLink,
  Sparkles,
  CreditCard,
  ShieldCheck,
  Receipt,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';

interface ReviewWorkspaceProps {
  magazine: MagazineWithRelations;
}

export function ReviewWorkspace({ magazine }: ReviewWorkspaceProps) {
  const router = useRouter();
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [selectedPagePreview, setSelectedPagePreview] = useState<string | null>(
    magazine.pages && magazine.pages.length > 0 ? magazine.pages[0].image_path : magazine.cover_image_url
  );

  // Payment Audit & Verification State
  const [paymentInfo, setPaymentInfo] = useState<{
    obligation?: MagazinePayment | null;
    manualClaim?: ManualUpiClaim | null;
    currentFeePaise?: number;
  } | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(true);
  const [isUpiRejectOpen, setIsUpiRejectOpen] = useState(false);
  const [upiRejectionReason, setUpiRejectionReason] = useState('');
  const [isResolvingUpi, setIsResolvingUpi] = useState(false);

  const fetchPaymentDetails = React.useCallback(async () => {
    try {
      setIsLoadingPayment(true);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await getMagazinePaymentDetailsAction(magazine.id, session?.access_token);
      if (res.success && res.data) {
        setPaymentInfo(res.data);
      }
    } catch (err) {
      console.error('Error fetching payment details:', err);
    } finally {
      setIsLoadingPayment(false);
    }
  }, [magazine.id]);

  React.useEffect(() => {
    fetchPaymentDetails();
  }, [fetchPaymentDetails]);

  const isPaid = paymentInfo?.obligation?.status === 'PAID';

  const canApprove = ['SUBMITTED', 'UNDER_REVIEW'].includes(magazine.status);
  const canReject = ['SUBMITTED', 'UNDER_REVIEW'].includes(magazine.status);
  const canPublish = magazine.status === 'APPROVED';
  const canArchive = magazine.status === 'PUBLISHED';

  // Mark as Under Review on mount if currently SUBMITTED
  React.useEffect(() => {
    if (magazine.status === 'SUBMITTED') {
      (async () => {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        startReviewMagazineAction(magazine.id, session?.access_token).catch(console.error);
      })();
    }
  }, [magazine.id, magazine.status]);

  const handleApprove = async () => {
    if (!isPaid) {
      setActionError('Cannot approve magazine: submission fee has not been verified.');
      return;
    }
    try {
      setIsSubmitting(true);
      setActionError(null);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await approveMagazineAction(magazine.id, undefined, session?.access_token);
      if (!res?.success) {
        setActionError(res?.error || 'Failed to approve publication.');
      } else {
        setActionSuccess('Publication successfully approved and ready for publishing.');
        router.refresh();
      }
    } catch (err: any) {
      setActionError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (reason: string) => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await rejectMagazineAction(magazine.id, reason, session?.access_token);
      if (!res?.success) {
        setActionError(res?.error || 'Failed to reject publication.');
      } else {
        setIsRejectModalOpen(false);
        setActionSuccess('Publication returned to department with required revisions.');
        router.refresh();
      }
    } catch (err: any) {
      setActionError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!isPaid) {
      setActionError('Cannot publish magazine: verified payment entitlement is required.');
      return;
    }
    try {
      setIsSubmitting(true);
      setActionError(null);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await publishMagazineAction(magazine.id, session?.access_token);
      if (!res?.success) {
        setActionError(res?.error || 'Failed to publish magazine.');
      } else {
        setActionSuccess('Publication officially published to the College Digital Archive!');
        router.refresh();
      }
    } catch (err: any) {
      setActionError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this publication? It will be removed from the public library.')) {
      return;
    }
    try {
      setIsSubmitting(true);
      setActionError(null);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await archiveMagazineAction(magazine.id, session?.access_token);
      if (!res?.success) {
        setActionError(res?.error || 'Failed to archive magazine.');
      } else {
        setActionSuccess('Publication moved to institutional archive.');
        router.refresh();
      }
    } catch (err: any) {
      setActionError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveUpiClaim = async (approved: boolean) => {
    if (!paymentInfo?.manualClaim) return;
    if (!approved && !upiRejectionReason.trim()) {
      setActionError('Please specify a rejection reason for the manual UPI claim.');
      return;
    }

    try {
      setIsResolvingUpi(true);
      setActionError(null);
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await verifyManualUpiClaimAction(
        {
          claimId: paymentInfo.manualClaim.id,
          approved,
          rejectionReason: approved ? undefined : upiRejectionReason.trim(),
          magazineId: magazine.id,
        },
        session?.access_token
      );

      if (!res.success) {
        setActionError(res.error || 'Failed to resolve UPI claim.');
      } else {
        setActionSuccess(
          approved
            ? 'Manual UPI payment verified! Payment obligation is now marked PAID.'
            : 'Manual UPI claim has been rejected.'
        );
        setIsUpiRejectOpen(false);
        setUpiRejectionReason('');
        await fetchPaymentDetails();
        router.refresh();
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to resolve UPI claim.');
    } finally {
      setIsResolvingUpi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/review"
          className="inline-flex items-center gap-2 text-sm text-[#55524D] hover:text-[#171717] font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Review Queue</span>
        </Link>

        <div className="flex items-center gap-2">
          <PublicationStatusBadge status={magazine.status} />
          <ProcessingStatusBadge status={magazine.processing_status} />
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 p-4 rounded-sm text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-sm text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Review Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Document & Pages Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-[#E8E2D8] rounded-sm p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D8] mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#77736C] font-medium">
                Page Asset Inspection
              </span>
              {magazine.processing_status === 'COMPLETED' && (
                <Link
                  href={`/reader/${magazine.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-sm text-[#B58A55] hover:text-[#171717] font-medium transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Open Full Digital Reader</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Main Preview Screen */}
            <div className="bg-[#F8F6F1] border border-[#E8E2D8] rounded-sm p-4 flex items-center justify-center min-h-[480px]">
              {selectedPagePreview ? (
                <div className="relative w-full max-w-md aspect-[1/1.414] shadow-lg rounded-xs overflow-hidden border border-[#E8E2D8]">
                  <Image
                    src={selectedPagePreview}
                    alt="Page preview"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 500px"
                  />
                </div>
              ) : (
                <div className="text-center text-[#77736C] text-sm font-mono">
                  No preview available
                </div>
              )}
            </div>

            {/* Processed Pages Thumbnail Rail */}
            {magazine.pages && magazine.pages.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#E8E2D8]">
                <div className="text-xs font-mono text-[#55524D] uppercase font-medium mb-2.5">
                  Processed Pages ({magazine.pages.length}) — Click thumbnail to inspect
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-2">
                  {magazine.pages.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPagePreview(p.image_path)}
                      className={`relative w-14 aspect-[1/1.414] rounded-xs overflow-hidden border shrink-0 transition-all ${
                        selectedPagePreview === p.image_path
                          ? 'border-[#171717] ring-2 ring-[#171717]/20 scale-105'
                          : 'border-[#E8E2D8] hover:border-[#77736C]'
                      }`}
                    >
                      <Image
                        src={p.thumbnail_path || p.image_path}
                        alt={`Page ${p.page_number}`}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] font-mono text-white text-center py-0.5">
                        {p.page_number}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Metadata & Review Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Action Control Panel */}
          <div className="bg-white border border-[#E8E2D8] rounded-sm p-6 shadow-xs space-y-5">
            <h3 className="font-serif font-semibold text-lg text-[#171717] border-b border-[#E8E2D8] pb-3">
              Editorial Review Actions
            </h3>

            {/* Current State Info Banner */}
            <div className="bg-[#F8F6F1] border border-[#E8E2D8] p-4 rounded-sm">
              <div className="text-xs font-mono text-[#77736C] uppercase font-medium mb-1">
                Current Status
              </div>
              <div className="text-base font-semibold text-[#171717]">
                {MAGAZINE_STATUS_LABELS[magazine.status]}
              </div>
              {magazine.rejection_reason && (
                <div className="mt-2 text-sm text-rose-800 bg-rose-50 p-3 rounded-xs border border-rose-200">
                  <strong>Revision Note:</strong> {magazine.rejection_reason}
                </div>
              )}
            </div>

            {/* Payment Warning if unpaid */}
            {!isPaid && !isLoadingPayment && (
              <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xs text-sm text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Payment Gating Active:</span>
                  This magazine has not fulfilled the submission fee. Editorial approval and publishing are blocked until payment is verified.
                </div>
              </div>
            )}

            {/* Action Buttons depending on status */}
            <div className="space-y-3 pt-2">
              {canApprove && (
                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting || magazine.processing_status !== 'COMPLETED' || !isPaid}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-sm py-3 min-h-[44px] gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Publication</span>
                </Button>
              )}

              {canPublish && (
                <Button
                  onClick={handlePublish}
                  disabled={isSubmitting || !isPaid}
                  className="w-full bg-[#171717] hover:bg-[#33312E] text-[#F8F6F1] font-medium text-sm py-3 min-h-[44px] gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Globe className="w-4 h-4 text-[#B58A55]" />
                  <span>Publish to College Digital Archive</span>
                </Button>
              )}

              {canReject && (
                <Button
                  variant="outline"
                  onClick={() => setIsRejectModalOpen(true)}
                  disabled={isSubmitting}
                  className="w-full border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 font-medium text-sm py-3 min-h-[44px] gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Return for Revisions / Reject</span>
                </Button>
              )}

              {canArchive && (
                <Button
                  variant="outline"
                  onClick={handleArchive}
                  disabled={isSubmitting}
                  className="w-full border-stone-300 text-stone-700 hover:bg-stone-100 font-medium text-sm py-3 min-h-[44px] gap-2"
                >
                  <Archive className="w-4 h-4" />
                  <span>Archive Publication</span>
                </Button>
              )}
            </div>
          </div>

          {/* Financial & Payment Audit Card */}
          <div className="bg-white border border-[#E8E2D8] rounded-sm p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#B58A55]" />
                <h4 className="font-serif font-semibold text-base text-[#171717]">
                  Financial & Payment Audit
                </h4>
              </div>
              <div>
                {isPaid ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs px-2.5 py-0.5">
                    Paid & Verified
                  </Badge>
                ) : paymentInfo?.obligation?.status === 'MANUAL_VERIFICATION_PENDING' ? (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs px-2.5 py-0.5">
                    UPI Claim Pending
                  </Badge>
                ) : paymentInfo?.obligation?.status === 'PENDING' ? (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-2.5 py-0.5">
                    Order Pending
                  </Badge>
                ) : paymentInfo?.obligation?.status === 'FAILED' ? (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs px-2.5 py-0.5">
                    Payment Failed
                  </Badge>
                ) : (
                  <Badge className="bg-stone-100 text-stone-700 border-stone-300 text-xs px-2.5 py-0.5">
                    Unpaid
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[#55524D] font-mono text-xs uppercase block">Submission Fee</span>
                <span className="font-semibold text-base font-mono text-[#171717]">
                  {formatPaiseToInr(paymentInfo?.obligation?.amount_paise || paymentInfo?.currentFeePaise || 2000)}
                </span>
              </div>
              <div>
                <span className="text-[#55524D] font-mono text-xs uppercase block">Payment Method</span>
                <span className="font-medium text-sm text-[#171717]">
                  {paymentInfo?.obligation?.payment_method === 'RAZORPAY'
                    ? 'Razorpay Checkout'
                    : paymentInfo?.obligation?.payment_method === 'MANUAL_UPI'
                    ? 'Manual UPI'
                    : 'Not Selected'}
                </span>
              </div>
              <div>
                <span className="text-[#55524D] font-mono text-xs uppercase block">Payment Date</span>
                <span className="text-[#33312E] font-mono text-xs sm:text-sm">
                  {paymentInfo?.obligation?.verified_at
                    ? new Date(paymentInfo.obligation.verified_at).toLocaleDateString()
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-[#55524D] font-mono text-xs uppercase block">Provider Order</span>
                <span className="text-[#33312E] font-mono text-xs sm:text-sm truncate block" title={paymentInfo?.obligation?.provider_order_id || 'None'}>
                  {paymentInfo?.obligation?.provider_order_id || '—'}
                </span>
              </div>
            </div>

            {/* Manual UPI Claim Inspection & Resolution */}
            {paymentInfo?.manualClaim && (
              <div className="pt-3 border-t border-[#F0EBE1] space-y-3">
                <div className="bg-[#F8F6F1] border border-[#E8E2D8] p-4 rounded-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-[#77736C] font-medium">
                      Manual UPI Claim Submitted
                    </span>
                    <Badge
                      className={`text-xs px-2.5 py-0.5 ${
                        paymentInfo.manualClaim.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : paymentInfo.manualClaim.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {paymentInfo.manualClaim.status}
                    </Badge>
                  </div>

                  <div className="text-sm space-y-1.5">
                    <div>
                      <span className="text-[#55524D]">Transaction Ref (UTR): </span>
                      <code className="font-mono font-semibold bg-white px-2 py-0.5 border border-[#E8E2D8] rounded text-[#171717] text-sm">
                        {paymentInfo.manualClaim.utr_reference}
                      </code>
                    </div>
                    <div>
                      <span className="text-[#55524D]">Submitted: </span>
                      <span className="text-[#33312E]">{new Date(paymentInfo.manualClaim.created_at).toLocaleString()}</span>
                    </div>
                    {paymentInfo.manualClaim.notes && (
                      <div>
                        <span className="text-[#55524D]">Notes: </span>
                        <span className="italic text-[#33312E]">{paymentInfo.manualClaim.notes}</span>
                      </div>
                    )}
                    {paymentInfo.manualClaim.rejection_reason && (
                      <div className="text-rose-800 bg-rose-50 p-2.5 rounded border border-rose-200 mt-2 text-sm">
                        <strong>Rejection Reason:</strong> {paymentInfo.manualClaim.rejection_reason}
                      </div>
                    )}
                  </div>

                  {/* Super Admin Action Controls for Pending Claim */}
                  {paymentInfo.manualClaim.status === 'PENDING' && (
                    <div className="pt-2 border-t border-[#E8E2D8] space-y-2">
                      {!isUpiRejectOpen ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleResolveUpiClaim(true)}
                            disabled={isResolvingUpi}
                            className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white text-sm py-2 min-h-[38px] gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>Verify & Confirm Paid</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsUpiRejectOpen(true)}
                            disabled={isResolvingUpi}
                            className="border-rose-300 text-rose-700 hover:bg-rose-50 text-sm py-2 min-h-[38px] gap-1.5"
                          >
                            <X className="w-4 h-4" />
                            <span>Reject Claim</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2.5 bg-white p-3 border border-rose-200 rounded-xs">
                          <label className="text-xs font-medium text-rose-900 block">
                            Reason for Claim Rejection:
                          </label>
                          <input
                            type="text"
                            value={upiRejectionReason}
                            onChange={(e) => setUpiRejectionReason(e.target.value)}
                            placeholder="e.g. UTR not found in bank statement or amount mismatch"
                            className="w-full text-sm p-2 border border-rose-300 rounded focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setIsUpiRejectOpen(false);
                                setUpiRejectionReason('');
                              }}
                              disabled={isResolvingUpi}
                              className="text-sm h-8 px-3"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleResolveUpiClaim(false)}
                              disabled={isResolvingUpi || !upiRejectionReason.trim()}
                              className="bg-rose-700 hover:bg-rose-800 text-white text-sm h-8 px-3"
                            >
                              Confirm Rejection
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Publication Metadata Card */}
          <div className="bg-white border border-[#E8E2D8] rounded-sm p-6 shadow-xs space-y-4">
            <h4 className="font-serif font-semibold text-base text-[#171717] border-b border-[#E8E2D8] pb-2">
              Publication Metadata
            </h4>

            <div className="space-y-3.5 text-sm">
              <div>
                <span className="text-[#55524D] font-mono text-xs uppercase block">Title</span>
                <span className="font-serif text-base sm:text-lg font-semibold text-[#171717]">{magazine.title}</span>
              </div>

              {magazine.subtitle && (
                <div>
                  <span className="text-[#55524D] font-mono text-xs uppercase block">Subtitle</span>
                  <span className="text-[#33312E] text-sm">{magazine.subtitle}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[#55524D] font-mono text-xs uppercase block">Department</span>
                  <div className="flex items-center gap-1.5 text-[#171717] font-medium mt-0.5">
                    <Building2 className="w-4 h-4 text-[#77736C]" />
                    <span>{magazine.department?.name || 'College Wide'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[#55524D] font-mono text-xs uppercase block">Academic Year</span>
                  <div className="flex items-center gap-1.5 text-[#171717] font-mono mt-0.5">
                    <Calendar className="w-4 h-4 text-[#77736C]" />
                    <span>{magazine.academic_year}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F0EBE1]">
                <div>
                  <span className="text-[#55524D] font-mono text-xs uppercase block">Edition</span>
                  <span className="font-mono text-[#171717] text-sm">{magazine.edition || '—'}</span>
                </div>
                <div>
                  <span className="text-[#55524D] font-mono text-xs uppercase block">Volume</span>
                  <span className="font-mono text-[#171717] text-sm">{magazine.volume || '—'}</span>
                </div>
                <div>
                  <span className="text-[#55524D] font-mono text-xs uppercase block">Issue</span>
                  <span className="font-mono text-[#171717] text-sm">{magazine.issue || '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#F0EBE1]">
                <div>
                  <span className="text-[#55524D] font-mono text-xs uppercase block">Page Count</span>
                  <div className="flex items-center gap-1.5 font-mono text-[#171717] mt-0.5">
                    <Layers className="w-4 h-4 text-[#77736C]" />
                    <span>{magazine.page_count || 0} pages</span>
                  </div>
                </div>

                <div>
                  <span className="text-[#55524D] font-mono text-xs uppercase block">Submitted By</span>
                  <div className="flex items-center gap-1.5 text-[#171717] mt-0.5">
                    <User className="w-4 h-4 text-[#77736C]" />
                    <span className="truncate">{magazine.author?.full_name || 'Department Desk'}</span>
                  </div>
                </div>
              </div>

              {magazine.description && (
                <div className="pt-2 border-t border-[#F0EBE1]">
                  <span className="text-[#55524D] font-mono text-xs uppercase block mb-1">
                    Editorial Description
                  </span>
                  <p className="text-sm text-[#33312E] leading-relaxed bg-[#F8F6F1] p-3.5 rounded-xs">
                    {magazine.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="bg-white border border-[#E8E2D8] rounded-sm p-6 shadow-xs space-y-4">
            <h4 className="font-serif font-semibold text-base text-[#171717] border-b border-[#E8E2D8] pb-2 flex items-center justify-between">
              <span>Publication Audit History</span>
              <Clock className="w-4 h-4 text-[#77736C]" />
            </h4>
            <StatusHistoryTimeline history={magazine.status_history || []} />
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleReject}
        magazineTitle={magazine.title}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
