'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/admin/admin-auth-context';
import { AdminHeader } from '@/components/layout/admin-header';
import { AdminPublicationsHeader } from '@/components/admin/admin-publications-header';
import { PublicationTable } from '@/components/admin/publication-table';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export default function AdminMagazinesListPage() {
  const router = useRouter();
  const { profile, token, isLoading } = useAdminAuth();
  const [data, setData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadMagazines = useCallback(async (authToken: string) => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ action: 'magazines' }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          router.replace('/admin/login');
        } else {
          setFetchError(errJson.error || 'Failed to load publications from server.');
        }
      }
    } catch (err: any) {
      console.error('Failed to load magazines data:', err);
      setFetchError(err.message || 'Network error occurred while fetching publications.');
    } finally {
      setIsFetching(false);
    }
  }, [router]);

  useEffect(() => {
    if (isLoading) return;
    if (!profile) {
      router.replace('/admin/login');
      return;
    }

    if (token) {
      loadMagazines(token);
    } else {
      setIsFetching(false);
    }
  }, [profile, token, isLoading, router, loadMagazines]);

  // Autonomous Realtime updates & gentle fallback status refresh (does not drive processing from browser)
  useEffect(() => {
    if (!token) return;

    // 1. Supabase Realtime subscription for instant progress updates
    const supabase = createClient();
    const channel = supabase
      .channel('admin-magazines-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'magazines' },
        () => {
          loadMagazines(token);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pdf_processing_jobs' },
        () => {
          loadMagazines(token);
        }
      )
      .subscribe();

    // 2. Gentle watchdog fallback (15s): Refreshes status and drives non-conflicting progress
    const activeMagazines = (data?.magazines || []).filter(
      (m: any) => m.processing_status === 'PROCESSING' || m.processing_status === 'QUEUED'
    );

    let fallbackTimer: NodeJS.Timeout | null = null;
    if (activeMagazines.length > 0) {
      fallbackTimer = setInterval(async () => {
        loadMagazines(token);

        // Safe watchdog step: ensures progress continues even if container worker is offline
        for (const mag of activeMagazines) {
          try {
            await fetch('/api/admin/data', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ action: 'process-step', id: mag.id, maxPages: 4 }),
            });
          } catch {
            // Guarded watchdog step
          }
        }
      }, 15000);
    }

    return () => {
      supabase.removeChannel(channel);
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [data?.magazines, token, loadMagazines]);

  if (isLoading || (isFetching && !data && !fetchError)) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-sm bg-[#171717] text-[#F8F6F1] flex items-center justify-center mx-auto font-serif text-base font-semibold animate-pulse">
            M
          </div>
          <p className="text-xs font-mono text-[#77736C]">Loading Publications...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  if (fetchError && !data) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
        <AdminHeader profile={profile} department={profile.department_id ? ({ id: profile.department_id, name: 'Department' } as any) : null} />
        <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-10 space-y-6">
          <div className="p-6 bg-white border border-rose-200 rounded-sm shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>Failed to load publications</span>
            </div>
            <p className="text-xs text-[#77736C]">{fetchError}</p>
            {token && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadMagazines(token)}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  }

  const isSuper = profile.role === 'SUPER_ADMIN';
  const department = data?.department || null;
  const magazines = data?.magazines || [];

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <AdminHeader profile={profile} department={department} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-10 space-y-8">
        <AdminPublicationsHeader
          isSuper={isSuper}
          departmentName={department?.name}
        />

        {/* Management Table */}
        <PublicationTable magazines={magazines} />
      </main>
    </div>
  );
}

