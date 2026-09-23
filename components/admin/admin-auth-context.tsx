'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/auth';
import { Department } from '@/types/department';

interface AdminAuthContextType {
  user: any | null;
  profile: Profile | null;
  department: Department | null;
  token: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  checkAuth: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<{
    user: any | null;
    profile: Profile | null;
    department: Department | null;
    token: string | null;
    isLoading: boolean;
  }>({
    user: null,
    profile: null,
    department: null,
    token: null,
    isLoading: true,
  });

  const isCheckingRef = useRef(false);

  const checkAuth = useCallback(async (forcedToken?: string) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const activeToken = forcedToken || session?.access_token;

      if (!session || !session.user || !activeToken) {
        setAuthState({
          user: null,
          profile: null,
          department: null,
          token: null,
          isLoading: false,
        });
        if (pathname !== '/admin/login' && pathname !== '/admin/setup') {
          router.replace('/admin/login');
        }
        return;
      }

      // Fetch verified profile from server using tab token
      const res = await fetch('/api/admin/me', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (!res.ok) {
        await supabase.auth.signOut();
        setAuthState({
          user: null,
          profile: null,
          department: null,
          token: null,
          isLoading: false,
        });
        if (pathname !== '/admin/login') {
          router.replace('/admin/login?error=unauthorized_profile');
        }
        return;
      }

      const data = await res.json();
      setAuthState({
        user: session.user,
        profile: data.profile,
        department: data.department || null,
        token: activeToken,
        isLoading: false,
      });
    } catch (err) {
      console.error('[AdminAuth] Error checking session:', err);
      setAuthState({
        user: null,
        profile: null,
        department: null,
        token: null,
        isLoading: false,
      });
      if (pathname !== '/admin/login') {
        router.replace('/admin/login');
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [pathname, router]);

  // Initial mount verification and auth state listener (does not re-fire on route changes)
  useEffect(() => {
    checkAuth();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
          checkAuth(session.access_token);
        }
      } else if (event === 'SIGNED_OUT') {
        setAuthState({
          user: null,
          profile: null,
          department: null,
          token: null,
          isLoading: false,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during signout:', err);
    } finally {
      setAuthState({
        user: null,
        profile: null,
        department: null,
        token: null,
        isLoading: false,
      });
      router.replace('/admin/login');
    }
  };

  const refreshToken = async (): Promise<string | null> => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      setAuthState((prev) => ({ ...prev, token: session.access_token }));
      return session.access_token;
    }
    return null;
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user: authState.user,
        profile: authState.profile,
        department: authState.department,
        token: authState.token,
        isLoading: authState.isLoading,
        signOut,
        refreshToken,
        checkAuth: () => checkAuth(),
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return ctx;
}
