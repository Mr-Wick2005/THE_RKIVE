'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CoverUploader } from './cover-uploader';
import { PdfUploader } from './pdf-uploader';
import { ConfirmSubmitDialog } from './confirm-submit-dialog';
import { MagazineCover } from '@/components/magazines/magazine-cover';
import { ProcessingStatusBadge } from './processing-status-badge';
import { MagazineWithRelations } from '@/types/magazine';
import { Department } from '@/types/department';
import {
  createMagazineAction,
  updateMagazineAction,
  retryMagazineProcessingAction,
} from '@/app/actions/magazines';
import { slugify, formatDate } from '@/lib/utils';
import {
  Building2,
  Save,
  Send,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  BookOpen,
  RefreshCw,
  FileCheck,
  FileText,
} from 'lucide-react';

interface PublicationFormProps {
  initialData?: MagazineWithRelations | null;
  department: Department | null;
  isSuperAdmin?: boolean;
  departments?: Department[];
}

export function PublicationForm({
  initialData,
  department,
  isSuperAdmin = false,
  departments = [],
}: PublicationFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData);

  // Form State
  const [title, setTitle] = useState(initialData?.title || '');
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [academicYear, setAcademicYear] = useState(initialData?.academic_year || '2025-2026');
  const [edition, setEdition] = useState(initialData?.edition || '');
  const [volume, setVolume] = useState(initialData?.volume || '');
  const [issue, setIssue] = useState(initialData?.issue || '');
  const [pageCount, setPageCount] = useState(initialData?.page_count?.toString() || '');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(initialData?.department_id || department?.id || '');
  const selectedDepartment = isSuperAdmin
    ? departments.find((item) => item.id === selectedDepartmentId) || null
    : department;

  // Attached files
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // Status & Feedback
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isRetryingProcessing, setIsRetryingProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Simulated preview object
  const previewMagazine: MagazineWithRelations = {
    id: initialData?.id || 'temp-id',
    slug: slugify(title) || 'preview-slug',
    title: title || 'Untitled Publication',
    subtitle: subtitle || null,
    description: description || null,
    academic_year: academicYear || '2025-2026',
    edition: edition || 'Draft Edition',
    volume: volume || null,
    issue: issue || null,
    cover_image_url: coverFile ? URL.createObjectURL(coverFile) : initialData?.cover_image_url || null,
    original_pdf_url: null,
    page_count: pageCount ? parseInt(pageCount, 10) : initialData?.page_count || 0,
    status: initialData?.status || 'DRAFT',
    processing_status: initialData?.processing_status || 'NOT_STARTED',
    processing_error: initialData?.processing_error || null,
    processing_started_at: initialData?.processing_started_at || null,
    processing_completed_at: initialData?.processing_completed_at || null,
    processed_at: initialData?.processed_at || null,
    created_by: 'user',
    department_id: department?.id || 'dept',
    published_at: null,
    rejection_reason: initialData?.rejection_reason || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    department: department || undefined,
  };

  const handleRetryProcessing = async () => {
    if (!initialData?.id) return;
    setIsRetryingProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await retryMagazineProcessingAction(initialData.id);
      if (result.success) {
        setSuccessMessage('PDF processing started. Document pages are being generated.');
        router.refresh();
      } else {
        setErrorMessage(result.error || 'Failed to start PDF processing.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Retry failed.');
    } finally {
      setIsRetryingProcessing(false);
    }
  };

  const handleFormSubmit = async (submitNow: boolean = false) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please enter a publication title.');
      return;
    }

    if (!academicYear.trim()) {
      setErrorMessage('Please enter an academic year (e.g., 2025-2026).');
      return;
    }
    if (isSuperAdmin && !selectedDepartmentId) {
      setErrorMessage('Select an academic department for this publication.');
      return;
    }

    // Submission safety check
    if (submitNow) {
      if (isEditing && initialData) {
        if (initialData.processing_status !== 'COMPLETED' && !pdfFile) {
          setErrorMessage('This publication must finish processing before it can be submitted for review.');
          setShowConfirmModal(false);
          return;
        }
      }
      setIsSubmittingReview(true);
    } else {
      setIsSavingDraft(true);
    }

    try {
      const formData = new FormData();
      formData.set('title', title);
      formData.set('subtitle', subtitle);
      formData.set('description', description);
      formData.set('academic_year', academicYear);
      formData.set('edition', edition);
      formData.set('volume', volume);
      formData.set('issue', issue);
      formData.set('page_count', pageCount);
      formData.set('submit_now', submitNow ? 'true' : 'false');

      if (selectedDepartment?.id) {
        formData.set('department_id', selectedDepartment.id);
      }

      if (coverFile) {
        formData.set('cover_file', coverFile);
      }

      if (pdfFile) {
        formData.set('pdf_file', pdfFile);
      }

      const result = isEditing && initialData
        ? await updateMagazineAction(initialData.id, formData)
        : await createMagazineAction(formData);

      if (!result.success) {
        setErrorMessage(result.error || 'Operation failed. Please try again.');
        setIsSavingDraft(false);
        setIsSubmittingReview(false);
        setShowConfirmModal(false);
        return;
      }

      setSuccessMessage(
        submitNow
          ? 'Publication submitted for college editorial review!'
          : isEditing
          ? 'Draft changes saved successfully!'
          : 'New publication draft created successfully!'
      );

      setTimeout(() => {
        router.push('/admin/magazines');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setIsSavingDraft(false);
      setIsSubmittingReview(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Messages */}
      {initialData?.status === 'REJECTED' && initialData.rejection_reason && (
        <div className="p-4 rounded-sm bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 font-semibold text-rose-800 uppercase tracking-wider font-mono text-[11px]">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Editorial Revision Required by College Super Admin</span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed pl-6 whitespace-pre-wrap">
            {initialData.rejection_reason}
          </p>
          <div className="pl-6 pt-1 text-[11px] text-rose-700">
            Please make the requested updates below and click <strong>&ldquo;Submit for College Review&rdquo;</strong> to resubmit.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Form Column */}
        <div className="lg:col-span-8 space-y-8">
          {/* Section 1: Department Scope (Locked Read-Only) */}
          <section className="border border-[#E8E2D8] bg-white rounded-sm p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-[#B58A55]">
                Section 1 • Editorial Scope
              </span>
              <span className="text-[10px] font-mono text-[#77736C]">
                Security Enforced
              </span>
            </div>

            <div className="p-4 rounded-sm bg-[#F8F6F1] border border-[#E8E2D8] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-white border border-[#E8E2D8] flex items-center justify-center text-[#171717]">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#77736C] block">
                    Authoring Academic Department
                  </span>
                  <span className="text-sm font-semibold text-[#171717]">
                    {selectedDepartment?.name || 'Department Administrator'}
                  </span>
                </div>
              </div>

              <span className="text-[11px] font-mono px-2 py-0.5 rounded-sm bg-emerald-100 text-emerald-900 border border-emerald-300">
                Department Scoped
              </span>
            </div>
            {isSuperAdmin && !isEditing && (
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E8E2D8] rounded-sm text-xs text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                required
              >
                <option value="">Select Academic Department</option>
                {departments.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.short_name})</option>)}
              </select>
            )}
          </section>

          {/* Section 2: Publication Details */}
          <section className="border border-[#E8E2D8] bg-white rounded-sm p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="border-b border-[#F0EBE1] pb-3">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-[#B58A55]">
                Section 2 • Publication Details
              </span>
              <h2 className="font-serif text-xl font-medium text-[#171717] mt-0.5">
                Archival Metadata
              </h2>
            </div>

            <div className="space-y-4">
              <Input
                label="Publication Title *"
                placeholder="e.g. TechNova: Frontiers of Distributed Systems"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              {title && (
                <p className="text-[11px] font-mono text-[#77736C]">
                  Generated URL Slug:{' '}
                  <span className="text-[#171717] font-semibold">
                    /magazine/{slugify(title)}
                  </span>
                </p>
              )}

              <Input
                label="Subtitle (Optional)"
                placeholder="e.g. Annual Department Research & Student Capstone Journal"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#44423E]">
                  Editorial Synopsis & Abstract
                </label>
                <textarea
                  rows={4}
                  placeholder="Provide an overview of the articles, research highlights, student projects, or editorial themes included in this edition..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-sm border border-[#E8E2D8] bg-white p-3 text-sm text-[#171717] placeholder:text-[#9A958E] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <Input
                  label="Academic Year *"
                  placeholder="e.g. 2025-2026"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  required
                />

                <Input
                  label="Edition / Theme (Optional)"
                  placeholder="e.g. Annual Research Edition"
                  value={edition}
                  onChange={(e) => setEdition(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Volume (Optional)"
                  placeholder="e.g. Vol. 14"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                />

                <Input
                  label="Issue (Optional)"
                  placeholder="e.g. Issue 1"
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                />

                <Input
                  label="Estimated Page Count"
                  type="number"
                  placeholder="e.g. 52"
                  value={pageCount}
                  onChange={(e) => setPageCount(e.target.value)}
                  min="0"
                />
              </div>
            </div>
          </section>

          {/* Section 3: File Uploads */}
          <section className="border border-[#E8E2D8] bg-white rounded-sm p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="border-b border-[#F0EBE1] pb-3">
              <span className="text-xs font-mono font-semibold uppercase tracking-widest text-[#B58A55]">
                Section 3 • Archival Media & Assets
              </span>
              <h2 className="font-serif text-xl font-medium text-[#171717] mt-0.5">
                Cover Artwork & PDF Document
              </h2>
            </div>

            <CoverUploader
              currentCoverUrl={initialData?.cover_image_url}
              onFileSelect={setCoverFile}
            />

            <div className="editorial-rule my-4" />

            <PdfUploader
              currentPdfUrl={initialData?.original_pdf_url}
              onFileSelect={setPdfFile}
            />
          </section>

          {/* Form Action Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-sm bg-white border border-[#E8E2D8] shadow-sm">
            <Link
              href="/admin/magazines"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-[#77736C] hover:text-[#171717] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cancel & Return</span>
            </Link>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => handleFormSubmit(false)}
                isLoading={isSavingDraft}
                disabled={isSubmittingReview}
                className="flex-1 sm:flex-initial gap-2"
              >
                <Save className="w-4 h-4 text-[#77736C]" />
                <span>Save Draft</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setShowConfirmModal(true)}
                isLoading={isSubmittingReview}
                disabled={isSavingDraft}
                className="flex-1 sm:flex-initial gap-2 bg-[#171717] hover:bg-[#2C2C2A]"
              >
                <Send className="w-4 h-4 text-[#B58A55]" />
                <span>Submit for Review</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right Live Preview Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24 space-y-4">
            <div className="border border-[#E8E2D8] bg-white rounded-sm p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#F0EBE1] pb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#B58A55]" />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#171717]">
                  Live Editorial Preview
                </span>
              </div>

              <div className="flex justify-center py-2">
                <div className="w-[200px] shadow-magazine-hover rounded-sm overflow-hidden">
                  <MagazineCover magazine={previewMagazine} size="md" />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#F0EBE1] text-xs">
                <div className="flex justify-between">
                  <span className="text-[#77736C]">Status:</span>
                  <span className="font-mono font-medium text-[#171717]">
                    {initialData?.status || 'DRAFT'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#77736C]">Department:</span>
                  <span className="font-mono font-medium text-[#171717]">
                    {department?.short_name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#77736C]">Academic Year:</span>
                  <span className="font-mono font-medium text-[#171717]">
                    {academicYear}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Processing Panel (when editing) */}
            {isEditing && (
              <div className="border border-[#E8E2D8] bg-white rounded-sm p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#B58A55]" />
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#171717]">
                      Document Pipeline
                    </span>
                  </div>
                  <ProcessingStatusBadge
                    status={initialData?.processing_status}
                    pageCount={initialData?.page_count}
                  />
                </div>

                <div className="space-y-3 text-xs">
                  {initialData?.processing_status === 'COMPLETED' && (
                    <div className="p-3 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Your publication is ready for review</span>
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        {initialData.page_count} pages extracted, optimized to WebP, and cached with thumbnails.
                      </p>
                    </div>
                  )}

                  {(initialData?.processing_status === 'PROCESSING' || initialData?.processing_status === 'QUEUED') && (
                    <div className="p-3 rounded-sm bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-800">
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                        <span>Preparing your digital publication...</span>
                      </div>
                      <p className="text-[11px] text-blue-700">
                        Extracting pages, generating crisp WebP assets, and building page navigation.
                      </p>
                    </div>
                  )}

                  {initialData?.processing_status === 'FAILED' && (
                    <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-rose-800">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Processing failed</span>
                      </div>
                      {initialData.processing_error && (
                        <p className="text-[11px] text-rose-700 font-mono">
                          {initialData.processing_error}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRetryProcessing}
                        isLoading={isRetryingProcessing}
                        className="w-full gap-1.5 border-rose-300 text-rose-800 hover:bg-rose-100 text-xs mt-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry Processing</span>
                      </Button>
                    </div>
                  )}

                  {(!initialData?.processing_status || initialData?.processing_status === 'NOT_STARTED') && (
                    <p className="text-[11px] text-[#77736C]">
                      Attach and save a PDF document to begin automated page extraction and optimization.
                    </p>
                  )}

                  <div className="space-y-1.5 pt-2 border-t border-[#F0EBE1] text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#77736C]">Pages:</span>
                      <span className="font-mono font-medium text-[#171717]">
                        {initialData?.page_count ? `${initialData.page_count} pages` : 'Not processed'}
                      </span>
                    </div>
                    {initialData?.processed_at && (
                      <div className="flex justify-between">
                        <span className="text-[#77736C]">Processed:</span>
                        <span className="font-mono text-[#77736C]">
                          {formatDate(initialData.processed_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Publication Submission Rule Notice */}
            <div className="p-4 rounded-sm bg-[#F8F6F1] border border-[#E8E2D8] space-y-2 text-[11px] text-[#77736C]">
              <span className="font-semibold text-[#171717] block uppercase font-mono tracking-wide">
                Institutional Workflow
              </span>
              <p className="leading-relaxed">
                Saving as <strong>Draft</strong> keeps the magazine editable in your department desk. Clicking <strong>Submit for Review</strong> submits the issue to the College Administration for formal publication approval.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmSubmitDialog
        isOpen={showConfirmModal}
        publicationTitle={title || 'Untitled Publication'}
        onConfirm={() => handleFormSubmit(true)}
        onCancel={() => setShowConfirmModal(false)}
        isSubmitting={isSubmittingReview}
      />
    </div>
  );
}
