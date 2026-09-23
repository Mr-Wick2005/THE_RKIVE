'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MagazineWithRelations, MagazineStatus } from '@/types/magazine';
import { PublicationStatusBadge } from './publication-status-badge';
import { ProcessingStatusBadge } from './processing-status-badge';
import { ConfirmSubmitDialog } from './confirm-submit-dialog';
import { ConfirmDeleteDialog } from './confirm-delete-dialog';
import { AdminEmptyState } from './admin-empty-state';
import { formatDate } from '@/lib/utils';
import {
  submitMagazineForReviewAction,
  deleteMagazineAction,
  retryMagazineProcessingAction,
} from '@/app/actions/magazines';
import {
  FileEdit,
  Trash2,
  Send,
  Eye,
  Search,
  BookOpen,
  Filter,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
} from 'lucide-react';

interface PublicationTableProps {
  magazines: MagazineWithRelations[];
}

export function PublicationTable({ magazines }: PublicationTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Submit modal state
  const [submittingMag, setSubmittingMag] = useState<MagazineWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deletingMag, setDeletingMag] = useState<MagazineWithRelations | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Retrying state
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Filter magazines
  const filtered = magazines.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.subtitle && m.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.academic_year.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStartSubmit = (mag: MagazineWithRelations) => {
    if (mag.processing_status !== 'COMPLETED') {
      setFeedback({
        type: 'error',
        message: 'This publication must finish processing before it can be submitted for review.',
      });
      return;
    }
    setSubmittingMag(mag);
  };

  const handleRetryProcessing = async (id: string, title: string) => {
    setRetryingId(id);
    setFeedback(null);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const result = await retryMagazineProcessingAction(id, session?.access_token);
      if (result.success) {
        setFeedback({
          type: 'success',
          message: `PDF processing started for "${title}". Pages are being generated.`,
        });
        router.refresh();
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to retry processing.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Retry failed.' });
    } finally {
      setRetryingId(null);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!submittingMag) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const result = await submitMagazineForReviewAction(submittingMag.id, session?.access_token);
      if (result.success) {
        setFeedback({
          type: 'success',
          message: `"${submittingMag.title}" has been submitted for college review.`,
        });
        setSubmittingMag(null);
        router.refresh();
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to submit publication.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Submission failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartDelete = (mag: MagazineWithRelations) => {
    setDeletingMag(mag);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMag) return;
    setIsDeleting(true);
    setFeedback(null);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const result = await deleteMagazineAction(deletingMag.id, session?.access_token);
      if (result.success) {
        setFeedback({
          type: 'success',
          message: `"${deletingMag.title}" was permanently deleted.`,
        });
        setDeletingMag(null);
        router.refresh();
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Failed to delete publication.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Delete failed.' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (magazines.length === 0) {
    return <AdminEmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-sm border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-sm bg-white border border-[#E8E2D8] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#77736C]" />
          <input
            type="text"
            placeholder="Search publication title or year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-sm border border-[#E8E2D8] text-[#171717] placeholder:text-[#9A958E] focus:outline-none focus:border-[#171717]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#77736C]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 text-xs rounded-sm border border-[#E8E2D8] bg-white text-[#171717] focus:outline-none focus:border-[#171717] w-full sm:w-auto"
          >
            <option value="ALL">All Statuses ({magazines.length})</option>
            <option value="DRAFT">Drafts</option>
            <option value="SUBMITTED">Submitted for Review</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="PUBLISHED">Published</option>
            <option value="REJECTED">Needs Changes</option>
          </select>
        </div>
      </div>

      {/* Publications Table */}
      <div className="border border-[#E8E2D8] bg-white rounded-sm shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E8E2D8] bg-[#F8F6F1]/80 text-[#77736C] font-mono uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Publication</th>
                <th className="py-3 px-4 font-semibold">Academic Year</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">PDF Processing</th>
                <th className="py-3 px-4 font-semibold">Last Updated</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F0EBE1]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-[#77736C]">
                    No publications match the active filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((mag) => {
                  const isDraft = mag.status === 'DRAFT';
                  const isSubmitted = mag.status === 'SUBMITTED';
                  const isPublished = mag.status === 'PUBLISHED';
                  const isRejected = mag.status === 'REJECTED';
                  const canEdit = isDraft || isSubmitted || isRejected;
                  const isProcessingFailed = mag.processing_status === 'FAILED';
                  const isProcessing = mag.processing_status === 'PROCESSING' || mag.processing_status === 'QUEUED';

                  return (
                    <tr key={mag.id} className="hover:bg-[#F8F6F1]/50 transition-colors">
                      {/* Cover & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3.5">
                          {/* Mini Cover Thumbnail */}
                          <div className="relative w-11 h-14 rounded-sm overflow-hidden bg-[#E8E2D8] border border-[#171717]/10 flex-shrink-0 flex items-center justify-center shadow-sm">
                            {mag.cover_image_url ? (
                              <Image
                                src={mag.cover_image_url}
                                alt=""
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <BookOpen className="w-4 h-4 text-[#77736C]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <span className="font-serif text-sm font-medium text-[#171717] truncate block max-w-xs sm:max-w-sm">
                              {mag.title}
                            </span>
                            {mag.subtitle && (
                              <span className="text-[11px] text-[#77736C] truncate block max-w-xs">
                                {mag.subtitle}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-[#9E7D3B]">
                              {mag.department?.short_name || 'Dept'} • {mag.page_count} Pages
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Academic Year & Edition */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <span className="text-[#171717] block font-medium">
                          {mag.academic_year}
                        </span>
                        <span className="text-[#77736C] text-[10px] block">
                          {mag.edition || 'Annual Issue'}
                        </span>
                      </td>

                      {/* Publication Status */}
                      <td className="py-3.5 px-4">
                        <PublicationStatusBadge status={mag.status} />
                      </td>

                      {/* Document Processing Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <ProcessingStatusBadge
                            status={mag.processing_status}
                            pageCount={mag.page_count}
                          />
                          {isProcessingFailed && (
                            <button
                              type="button"
                              onClick={() => handleRetryProcessing(mag.id, mag.title)}
                              disabled={retryingId === mag.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded-sm border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100 transition-colors"
                              title="Retry PDF Processing"
                            >
                              <RefreshCw className={`w-2.5 h-2.5 ${retryingId === mag.id ? 'animate-spin' : ''}`} />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Updated Date */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#77736C]">
                        {formatDate(mag.updated_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Edit Action */}
                          {canEdit && (
                            <Link
                              href={`/admin/magazines/${mag.id}/edit`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-[#E8E2D8] bg-white text-[#171717] hover:bg-[#171717] hover:text-[#F8F6F1] hover:border-[#171717] transition-all text-xs"
                            >
                              <FileEdit className="w-3 h-3" />
                              <span>Edit</span>
                            </Link>
                          )}

                          {/* Submit for Review (Drafts only) */}
                          {(isDraft || isRejected) && (
                            <button
                              type="button"
                              onClick={() => handleStartSubmit(mag)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-[#171717] text-[#F8F6F1] hover:bg-[#2C2C2A] transition-all text-xs shadow-sm font-medium"
                            >
                              <Send className="w-3 h-3 text-[#B58A55]" />
                              <span>Submit</span>
                            </button>
                          )}

                          {/* View Live / Detail */}
                          {isPublished && (
                            <Link
                              href={`/magazine/${mag.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-[#E8E2D8] bg-white text-[#171717] hover:bg-[#F0EBE1] transition-all text-xs"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </Link>
                          )}

                          {/* Delete Publication Action (All stages) */}
                          <button
                            type="button"
                            onClick={() => handleStartDelete(mag)}
                            className="p-1.5 text-[#77736C] hover:text-rose-700 hover:bg-rose-50 rounded-sm transition-colors cursor-pointer"
                            title="Delete Publication"
                            aria-label={`Delete ${mag.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {submittingMag && (
        <ConfirmSubmitDialog
          isOpen={Boolean(submittingMag)}
          publicationTitle={submittingMag.title}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setSubmittingMag(null)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingMag && (
        <ConfirmDeleteDialog
          isOpen={Boolean(deletingMag)}
          publicationTitle={deletingMag.title}
          publicationStatus={deletingMag.status}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingMag(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
