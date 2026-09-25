'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdminAuth } from '@/components/admin/admin-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

export function LoginForm() {
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
    <div className="cutout-card cutout-card-tape shadow-[8px_8px_0px_#1A1A1A] border-2 border-[#1A1A1A] p-8 sm:p-10 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-[#1A1A1A] text-[#FAF7F2] border-2 border-[#1A1A1A] flex items-center justify-center mx-auto mb-3 font-serif text-xl font-bold shadow-[2px_2px_0px_#1A1A1A]">
          M
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A1A]">
          Editorial Portal
        </h1>
        <p className="text-sm text-[#706B62] leading-relaxed">
          Sign in to access your administrative workspace. Super Admins and Department Admins are routed automatically.
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border-2 border-rose-800 text-rose-900 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-800 flex-shrink-0 mt-0.5" />
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
          className="w-full mt-3 bg-[#1A1A1A] hover:bg-[#1B44B8] border-2 border-[#1A1A1A] hover:border-[#1B44B8] shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[5px_5px_0px_#1B44B8] text-white py-3"
          isLoading={isLoading}
        >
          Sign In to Editorial Desk
        </Button>
      </form>

      <div className="pt-4 border-t border-[#1A1A1A]/15 text-xs text-[#706B62]">
        <p className="leading-relaxed">
          Access is strictly restricted to assigned <strong>Super Admins</strong> and <strong>Department Admins</strong> governed by PostgreSQL Row Level Security.
        </p>
      </div>
    </div>
  );
}
