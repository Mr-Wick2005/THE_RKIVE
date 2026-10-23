'use client';

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MagazineStatus } from '@/types/magazine';
import { PublicationStatusBadge } from './publication-status-badge';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  publicationTitle: string;
  publicationStatus?: MagazineStatus;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function ConfirmDeleteDialog({
  isOpen,
  publicationTitle,
  publicationStatus,
  onConfirm,
  onCancel,
  isDeleting = false,
}: ConfirmDeleteDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E2D8] rounded-sm max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 flex-shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-rose-700 font-medium block">
                Permanent Action
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#171717] mt-0.5">
                Delete Publication?
              </h3>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-[#77736C] hover:text-[#171717] p-1 rounded-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Copy */}
        <div className="space-y-3.5 text-sm text-[#33312E] leading-relaxed">
          <p>
            Are you sure you want to permanently delete{' '}
            <strong className="text-[#171717]">&ldquo;{publicationTitle}&rdquo;</strong>?
          </p>

          {publicationStatus && (
            <div className="flex items-center gap-2 text-xs sm:text-[13px] text-[#55524D]">
              <span>Current status:</span>
              <PublicationStatusBadge status={publicationStatus} />
            </div>
          )}

          <div className="p-4 rounded-sm bg-rose-50/70 border border-rose-200 space-y-2 text-rose-950">
            <div className="flex items-center gap-2 font-semibold text-rose-950 text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>This action cannot be undone</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-rose-900 text-xs sm:text-[13px] leading-relaxed">
              <li>The publication record and audit history will be permanently deleted.</li>
              <li>Cover artwork, original PDF, and all generated page images will be purged from storage.</li>
              {publicationStatus === 'PUBLISHED' && (
                <li className="font-semibold text-rose-950">
                  This publication will immediately be removed from the public archive and reader.
                </li>
              )}
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
            disabled={isDeleting}
            className="text-sm min-h-[40px] px-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={onConfirm}
            isLoading={isDeleting}
            className="gap-2 bg-rose-700 hover:bg-rose-800 text-white text-sm min-h-[40px] px-5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Publication</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
