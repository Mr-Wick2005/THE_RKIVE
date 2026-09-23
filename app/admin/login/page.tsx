'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdminAuth } from '@/components/admin/admin-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorQuery = searchParams.get('error');
  const { profile, isLoading: isAuthLoading } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorQuery === 'unauthorized_profile'
      ? 'Your account does not have an active administrative profile.'
      : errorQuery === 'forbidden_super_admin_required'
      ? 'Access restricted: College Super Administrator privileges required.'
      : null
  );

  // Automatically redirect if already authenticated via the authoritative AdminAuthProvider
  useEffect(() => {
    if (isAuthLoading) return;
    if (profile?.is_active) {
      if (profile.role === 'SUPER_ADMIN') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/admin/magazines');
      }
    }
  }, [profile, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError || !authData.user) {
        setErrorMessage(authError?.message || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      // 2. Query the profile from public.profiles
      const { data: profile, error: profileError } = await (supabase.from('profiles') as any)
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setErrorMessage('Your account does not have an active administrative profile.');
        setIsLoading(false);
        return;
      }

      // 3. Verify account is active
      if (!profile.is_active) {
        setErrorMessage('Your administrative account has been deactivated. Please contact the College Super Admin.');
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // 4. Role-based Redirection
      if (profile.role === 'SUPER_ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/admin/magazines');
      }

      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during authentication.');
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-[#E2DBD0] bg-white rounded-sm shadow-editorial p-8 sm:p-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-sm bg-[#171717] text-[#F8F6F1] flex items-center justify-center mx-auto mb-3 font-serif text-lg font-semibold shadow-xs">
          M
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-[#171717]">
          Editorial Portal
        </h1>
        <p className="text-xs text-[#77736C] leading-relaxed">
          Sign in to access your administrative workspace. Super Admins and Department Admins are routed automatically.
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 rounded-sm bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Academic Email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@college.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />

        <Input
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2 bg-[#171717] hover:bg-[#33312E] text-white"
          isLoading={isLoading}
        >
          Sign In to Editorial Desk
        </Button>
      </form>

      <div className="pt-4 border-t border-[#F0EBE1] text-[11px] text-[#77736C]">
        <p className="leading-relaxed text-[10px]">
          Access is strictly restricted to assigned <strong>Super Admins</strong> and <strong>Department Admins</strong> governed by PostgreSQL Row Level Security.
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col justify-between p-6">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#77736C] hover:text-[#171717] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Public Archive</span>
        </Link>
        <span className="text-[11px] font-mono text-[#77736C]">
          EDITORIAL GATEWAY • SECURE AUTH
        </span>
      </div>

      {/* Login Card */}
      <div className="max-w-md w-full mx-auto my-12">
        <Suspense
          fallback={
            <div className="p-8 border border-[#E2DBD0] bg-white rounded-sm text-center text-xs text-[#77736C]">
              Loading login portal...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-[#77736C]">
        College Digital Magazine Platform • Editorial Authentication
      </div>
    </div>
  );
}
