'use client';

import React, { useState, useEffect } from 'react';
import { DepartmentWithStats, Department } from '@/types/department';
import { createDepartmentAction, updateDepartmentAction } from '@/app/actions/departments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Building2, AlertCircle, Check } from 'lucide-react';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentWithStats | Department | null;
  onSuccess: () => void;
}

export function DepartmentModal({
  isOpen,
  onClose,
  department,
  onSuccess,
}: DepartmentModalProps) {
  const isEditing = Boolean(department);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (department) {
      setName(department.name || '');
      setShortName(department.short_name || '');
      setDescription(department.description || '');
    } else {
      setName('');
      setShortName('');
      setDescription('');
    }
    setErrorMessage(null);
  }, [department, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedShort = shortName.trim().toUpperCase();
    const trimmedDesc = description.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Department name must be at least 2 characters.');
      setIsLoading(false);
      return;
    }

    if (!trimmedShort || trimmedShort.length < 1) {
      setErrorMessage('Department abbreviation/short name is required.');
      setIsLoading(false);
      return;
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const formData = new FormData();
      if (session?.access_token) {
        formData.set('access_token', session.access_token);
      }
      formData.set('name', trimmedName);
      formData.set('short_name', trimmedShort);
      if (trimmedDesc) {
        formData.set('description', trimmedDesc);
      }

      let result;
      if (isEditing && department) {
        formData.set('id', department.id);
        result = await updateDepartmentAction(formData);
      } else {
        result = await createDepartmentAction(formData);
      }

      if (!result || !result.success) {
        setErrorMessage(result?.error || 'Failed to save academic department.');
        setIsLoading(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-md border border-[#E8E2D8] shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E8E2D8] flex items-center justify-between bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#B58A55]" />
            <h3 className="font-serif font-semibold text-base text-[#171717]">
              {isEditing ? 'Edit Academic Department' : 'Add New Department'}
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

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
          <p className="text-xs text-[#55524D] leading-relaxed">
            {isEditing
              ? 'Update the official name, short abbreviation, and archival overview for this academic department.'
              : 'Add a new college academic faculty. Once created, it will immediately appear in the public Explore by Department section and magazine creation forms.'}
          </p>

          {errorMessage && (
            <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1 font-mono">
              Department Full Name <span className="text-rose-600">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. Computer Engineering, Information Technology, AIDS"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1 font-mono">
              Abbreviation / Short Name <span className="text-rose-600">*</span>
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. CS, IT, AIDS, ECS, MECH, ARTS"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              disabled={isLoading}
              className="uppercase"
            />
            <span className="text-[11px] text-[#77736C] font-mono mt-1 block">
              Used on magazine badges, filters, and navigation tags.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1 font-mono">
              Department Overview / Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of research capstones, fields of study, and publications..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E8E2D8] rounded-sm text-xs text-[#171717] placeholder:text-[#9E9A90] focus:outline-none focus:ring-1 focus:ring-[#171717]"
            />
          </div>

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
              type="submit"
              size="sm"
              disabled={isLoading}
              className="bg-[#171717] hover:bg-[#33312E] text-white text-xs gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5 text-[#B58A55]" />
              <span>{isLoading ? 'Saving Department...' : isEditing ? 'Update Department' : 'Create Department'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
