'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Department } from '@/types/department';
import { createDepartmentAdminAction } from '@/app/actions/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, UserPlus, Building2, AlertCircle } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
}

export function CreateUserModal({
  isOpen,
  onClose,
  departments,
}: CreateUserModalProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    if (!departmentId) {
      setErrorMessage('Please assign an academic department.');
      setIsLoading(false);
      return;
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const formData = new FormData();
      if (session?.access_token) {
        formData.set('access_token', session.access_token);
      }
      formData.set('full_name', fullName);
      formData.set('email', email);
      formData.set('password', password);
      formData.set('department_id', departmentId);

      const result = await createDepartmentAdminAction(formData);

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to provision department admin.');
        setIsLoading(false);
        return;
      }

      onClose();
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-md border border-[#E8E2D8] shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E2D8] flex items-center justify-between bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#B58A55]" />
            <h3 className="font-serif font-semibold text-base text-[#171717]">
              Provision Department Administrator
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-sm text-[#77736C] hover:text-[#171717] hover:bg-[#E8E2D8]/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-[#44423E] leading-relaxed">
            Create an authorized administrator account for a specific academic department. Department Admins can create and submit digital publications for their assigned department only.
          </p>

          {errorMessage && (
            <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Input
            label="Full Name"
            type="text"
            required
            placeholder="Dr. Jane Smith"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
          />

          <Input
            label="Institutional Email"
            type="email"
            required
            placeholder="jsmith@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />

          <Input
            label="Initial Password"
            type="password"
            required
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#171717] mb-1.5 font-mono">
              Assigned Academic Department <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E8E2D8] rounded-sm text-xs text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
                required
              >
                <option value="" disabled>Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.short_name})
                  </option>
                ))}
              </select>
            </div>
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
              className="bg-[#171717] hover:bg-[#33312E] text-white text-xs gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Creating Account...' : 'Provision Department Admin'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
