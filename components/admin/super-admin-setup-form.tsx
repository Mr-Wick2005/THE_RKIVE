'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { bootstrapFirstSuperAdminAction } from '@/app/actions/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export function SuperAdminSetupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.set('full_name', fullName);
      formData.set('email', email);
      formData.set('password', password);
      formData.set('confirm_password', confirmPassword);

      const result = await bootstrapFirstSuperAdminAction(formData);

      if (!result || !result.success) {
        setErrorMessage(result?.error || 'Failed to bootstrap Super Administrator.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Super Administrator account provisioned. Signing you in...');

      // Sign in client-side to set session cookie immediately
      const supabase = createClient();
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) {
        // If email confirmation is enabled on Supabase project, notify user
        setSuccessMessage('Super Admin provisioned. Please check your email if confirmation is required, then sign in.');
        setTimeout(() => {
          router.push('/admin/login');
        }, 2500);
      } else {
        setTimeout(() => {
          router.push('/admin/dashboard');
          router.refresh();
        }, 1200);
      }
    } catch (err: any) {
      console.error('Setup error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during setup.');
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-[#E2DBD0] bg-white rounded-sm shadow-editorial p-8 sm:p-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-sm bg-[#171717] text-[#F8F6F1] flex items-center justify-center mx-auto mb-3 font-serif text-xl font-semibold shadow-xs">
          <ShieldCheck className="w-6 h-6 text-[#B58A55]" />
        </div>
        <div className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono uppercase tracking-widest font-semibold">
          Initial Platform Bootstrap
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-[#171717]">
          Provision First Super Admin
        </h1>
        <p className="text-xs text-[#77736C] leading-relaxed max-w-sm mx-auto">
          Create the founding College Super Administrator account. This setup route will be permanently locked once created.
        </p>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-3.5 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Legal / Academic Name"
          type="text"
          required
          placeholder="Dean / Principal / Chief Editor"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isLoading}
        />

        <Input
          label="Institutional Super Admin Email"
          type="email"
          required
          autoComplete="email"
          placeholder="superadmin@college.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />

        <Input
          label="Master Administrative Password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />

        <Input
          label="Confirm Master Password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Repeat master password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2 bg-[#171717] hover:bg-[#33312E] text-white"
          isLoading={isLoading}
        >
          Initialize College Platform & Super Admin
        </Button>
      </form>

      {/* Security Footer */}
      <div className="pt-4 border-t border-[#F0EBE1] text-[11px] text-[#77736C] space-y-1">
        <div className="flex items-center gap-1.5 text-[#171717] font-medium">
          <Lock className="w-3 h-3 text-[#B58A55]" />
          <span>PostgreSQL Governance Guard</span>
        </div>
        <p className="leading-relaxed">
          The generated user is assigned <code>role = SUPER_ADMIN</code> with <code>department_id = NULL</code>.
        </p>
      </div>
    </div>
  );
}
