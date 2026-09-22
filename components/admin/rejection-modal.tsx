'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  magazineTitle: string;
  isSubmitting?: boolean;
}

export function RejectionModal({
  isOpen,
  onClose,
  onConfirm,
  magazineTitle,
  isSubmitting = false,
}: RejectionModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific reason for rejection to guide the department in making revisions.');
      return;
    }
    setError(null);
    await onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-md border border-[#E8E2D8] shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E2D8] flex items-center justify-between bg-[#F8F6F1]">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="font-serif font-semibold text-base text-[#171717]">
              Request Revisions / Reject Submission
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-sm text-[#77736C] hover:text-[#171717] hover:bg-[#E8E2D8]/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-[#44423E] leading-relaxed">
            You are returning <strong className="text-[#171717]">&ldquo;{magazineTitle}&rdquo;</strong> to the department editorial desk. The department administrator will be notified with your feedback and can revise the submission.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1.5 font-mono">
              Editorial Feedback & Required Changes <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              placeholder="e.g., Please upload a high-resolution cover image and verify page 4 editorial credits before resubmitting."
              className="w-full rounded-sm border border-[#E8E2D8] bg-[#F8F6F1]/50 p-3 text-xs text-[#171717] placeholder:text-[#77736C] focus:outline-none focus:ring-1 focus:ring-[#171717] focus:border-[#171717]"
              autoFocus
            />
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E2D8]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-rose-700 hover:bg-rose-800 text-white text-xs gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting Rejection...' : 'Confirm Rejection'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
