'use client';

import React, { useState } from 'react';
import { DepartmentWithStats } from '@/types/department';
import { deleteDepartmentAction } from '@/app/actions/departments';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';

interface DeleteDepartmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentWithStats | null;
  onSuccess: () => void;
}

export function DeleteDepartmentDialog({
  isOpen,
  onClose,
  department,
  onSuccess,
}: DeleteDepartmentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !department) return null;

  const hasPublications = (department.magazine_count || 0) > 0;

  const handleDelete = async () => {
    if (hasPublications) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const result = await deleteDepartmentAction(department.id, session?.access_token);

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to delete academic department.');
        setIsLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-md border border-[#E8E2D8] shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E2D8] flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="font-serif font-semibold text-base">
              Delete Department
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-sm text-[#77736C] hover:text-[#171717] hover:bg-[#E8E2D8]/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-[#44423E] leading-relaxed">
            Are you sure you want to permanently remove{' '}
            <strong className="text-[#171717]">
              {department.name} ({department.short_name})
            </strong>{' '}
            from the institutional registry?
          </p>

          {hasPublications ? (
            <div className="p-3.5 rounded-sm bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Protected Archive Dependency</span>
              </div>
              <p className="leading-relaxed text-[11px] text-amber-800">
                This department currently has{' '}
                <strong>{department.magazine_count} publication(s)</strong> archived in the system.
                To protect archive integrity and prevent broken references, departments with active magazines cannot be deleted.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-[#77736C] font-mono">
              This action cannot be undone once confirmed.
            </p>
          )}

          {errorMessage && (
            <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E2D8]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDelete}
              disabled={isLoading || hasPublications}
              className="bg-rose-700 hover:bg-rose-800 text-white text-xs gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Deleting...' : 'Confirm Delete'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
