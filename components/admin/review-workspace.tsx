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

  const canApprove = ['SUBMITTED', 'UNDER_REVIEW'].includes(magazine.status);
  const canReject = ['SUBMITTED', 'UNDER_REVIEW'].includes(magazine.status);
  const canPublish = magazine.status === 'APPROVED';
  const canArchive = magazine.status === 'PUBLISHED';

  // Mark as Under Review on mount if currently SUBMITTED
  React.useEffect(() => {
    if (magazine.status === 'SUBMITTED') {
      startReviewMagazineAction(magazine.id).catch(console.error);
    }
  }, [magazine.id, magazine.status]);

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      setActionError(null);
      const res = await approveMagazineAction(magazine.id);
      if (!res.success) {
        setActionError(res.error || 'Failed to approve publication.');
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
      const res = await rejectMagazineAction(magazine.id, reason);
      if (!res.success) {
        setActionError(res.error || 'Failed to reject publication.');
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
    try {
      setIsSubmitting(true);
      setActionError(null);
      const res = await publishMagazineAction(magazine.id);
      if (!res.success) {
        setActionError(res.error || 'Failed to publish magazine.');
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
      const res = await archiveMagazineAction(magazine.id);
      if (!res.success) {
        setActionError(res.error || 'Failed to archive magazine.');
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

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/review"
          className="inline-flex items-center gap-1.5 text-xs text-[#77736C] hover:text-[#171717] font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Review Queue</span>
        </Link>

        <div className="flex items-center gap-2">
          <PublicationStatusBadge status={magazine.status} />
          <ProcessingStatusBadge status={magazine.processing_status} />
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 p-4 rounded-sm text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-sm text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Review Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Document & Pages Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-[#E8E2D8] rounded-sm p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D8] mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#77736C]">
                Page Asset Inspection
              </span>
              {magazine.processing_status === 'COMPLETED' && (
                <Link
                  href={`/reader/${magazine.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-[#B58A55] hover:text-[#171717] font-medium transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Open Full Digital Reader</span>
                  <ExternalLink className="w-3 h-3" />
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
                <div className="text-center text-[#77736C] text-xs font-mono">
                  No preview available
                </div>
              )}
            </div>

            {/* Processed Pages Thumbnail Rail */}
            {magazine.pages && magazine.pages.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#E8E2D8]">
                <div className="text-[11px] font-mono text-[#77736C] uppercase mb-2">
                  Processed Pages ({magazine.pages.length}) — Click thumbnail to inspect
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
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
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] font-mono text-white text-center py-0.5">
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
            <h3 className="font-serif font-semibold text-base text-[#171717] border-b border-[#E8E2D8] pb-3">
              Editorial Review Actions
            </h3>

            {/* Current State Info Banner */}
            <div className="bg-[#F8F6F1] border border-[#E8E2D8] p-3.5 rounded-sm">
              <div className="text-[11px] font-mono text-[#77736C] uppercase mb-1">
                Current Status
              </div>
              <div className="text-sm font-semibold text-[#171717]">
                {MAGAZINE_STATUS_LABELS[magazine.status]}
              </div>
              {magazine.rejection_reason && (
                <div className="mt-2 text-xs text-rose-700 bg-rose-50 p-2 rounded-xs border border-rose-200">
                  <strong>Revision Note:</strong> {magazine.rejection_reason}
                </div>
              )}
            </div>

            {/* Action Buttons depending on status */}
            <div className="space-y-3 pt-2">
              {canApprove && (
                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting || magazine.processing_status !== 'COMPLETED'}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs py-2.5 gap-2 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Publication</span>
                </Button>
              )}

              {canPublish && (
                <Button
                  onClick={handlePublish}
                  disabled={isSubmitting}
                  className="w-full bg-[#171717] hover:bg-[#33312E] text-[#F8F6F1] font-medium text-xs py-2.5 gap-2 shadow-xs"
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
                  className="w-full border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 font-medium text-xs py-2.5 gap-2"
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
                  className="w-full border-stone-300 text-stone-700 hover:bg-stone-100 font-medium text-xs py-2.5 gap-2"
                >
                  <Archive className="w-4 h-4" />
                  <span>Archive Publication</span>
                </Button>
              )}
            </div>
          </div>

          {/* Publication Metadata Card */}
          <div className="bg-white border border-[#E8E2D8] rounded-sm p-6 shadow-xs space-y-4">
            <h4 className="font-serif font-semibold text-sm text-[#171717] border-b border-[#E8E2D8] pb-2">
              Publication Metadata
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#77736C] font-mono text-[10px] uppercase block">Title</span>
                <span className="font-serif text-sm font-semibold text-[#171717]">{magazine.title}</span>
              </div>

              {magazine.subtitle && (
                <div>
                  <span className="text-[#77736C] font-mono text-[10px] uppercase block">Subtitle</span>
                  <span className="text-[#44423E]">{magazine.subtitle}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[#77736C] font-mono text-[10px] uppercase block">Department</span>
                  <div className="flex items-center gap-1 text-[#171717] font-medium mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-[#77736C]" />
                    <span>{magazine.department?.name || 'College Wide'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[#77736C] font-mono text-[10px] uppercase block">Academic Year</span>
                  <div className="flex items-center gap-1 text-[#171717] font-mono mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-[#77736C]" />
                    <span>{magazine.academic_year}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#F0EBE1]">
                <div>
                  <span className="text-[#77736C] font-mono text-[10px] uppercase block">Edition</span>
                  <span className="font-mono text-[#171717]">{magazine.edition || '—'}</span>
                </div>
                <div>
                  <span className="text-[#77736C] font-mono text-[10px] uppercase block">Volume</span>
                  <span className="font-mono text-[#171717]">{magazine.volume || '—'}</span>
                </div>
                <div>
                  <span className="text-[#77736C] font-mono text-[10px] uppercase block">Issue</span>
                  <span className="font-mono text-[#171717]">{magazine.issue || '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#F0EBE1]">
                <div>
                  <span className="text-[#77736C] font-mono text-[10px] uppercase block">Page Count</span>
                  <div className="flex items-center gap-1 font-mono text-[#171717] mt-0.5">
                    <Layers className="w-3.5 h-3.5 text-[#77736C]" />
                    <span>{magazine.page_count || 0} pages</span>
                  </div>
                </div>

                <div>
                  <span className="text-[#77736C] font-mono text-[10px] uppercase block">Submitted By</span>
                  <div className="flex items-center gap-1 text-[#171717] mt-0.5">
                    <User className="w-3.5 h-3.5 text-[#77736C]" />
                    <span className="truncate">{magazine.author?.full_name || 'Department Desk'}</span>
                  </div>
                </div>
              </div>

              {magazine.description && (
                <div className="pt-2 border-t border-[#F0EBE1]">
                  <span className="text-[#77736C] font-mono text-[10px] uppercase block mb-1">
                    Editorial Description
                  </span>
                  <p className="text-xs text-[#44423E] leading-relaxed bg-[#F8F6F1] p-3 rounded-xs">
                    {magazine.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="bg-white border border-[#E8E2D8] rounded-sm p-6 shadow-xs space-y-4">
            <h4 className="font-serif font-semibold text-sm text-[#171717] border-b border-[#E8E2D8] pb-2 flex items-center justify-between">
              <span>Publication Audit History</span>
              <Clock className="w-3.5 h-3.5 text-[#77736C]" />
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
