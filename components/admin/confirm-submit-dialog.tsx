'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmSubmitDialogProps {
  isOpen: boolean;
  publicationTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ConfirmSubmitDialog({
  isOpen,
  publicationTitle,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: ConfirmSubmitDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E2D8] rounded-sm max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#FAF6F0] border border-[#E8E2D8] flex items-center justify-center text-[#B58A55] flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#B58A55] font-medium block">
                College Editorial Governance
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#171717] mt-0.5">
                Submit Publication for Review?
              </h3>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-[#77736C] hover:text-[#171717] p-1 rounded-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Copy */}
        <div className="space-y-3.5 text-sm text-[#33312E] leading-relaxed">
          <p>
            You are submitting <strong>&ldquo;{publicationTitle}&rdquo;</strong> for institutional review.
          </p>
          <div className="p-4 rounded-sm bg-[#F8F6F1] border border-[#E8E2D8] space-y-2">
            <p className="font-semibold text-[#171717]">What happens next:</p>
            <ul className="list-disc list-inside space-y-1.5 text-[#55524D]">
              <li>Publication status will change from <strong>Draft</strong> to <strong>Submitted</strong>.</li>
              <li>College administrators will verify academic accreditation and formatting.</li>
              <li>Approved issues will subsequently be published to the public archive.</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0EBE1]">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-sm min-h-[40px] px-4"
          >
            Keep as Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onConfirm}
            isLoading={isSubmitting}
            className="gap-2 bg-[#171717] hover:bg-[#2C2C2A] text-sm min-h-[40px] px-5"
          >
            <span>Confirm & Submit for Review</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
