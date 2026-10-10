'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/admin/admin-auth-context';
import { StudioShell } from '@/components/admin/studio';
import { CmsStudioData } from '@/types/cms';

export default function AdminStudioPage() {
  const router = useRouter();
  const { profile, token, isLoading } = useAdminAuth();
  const [data, setData] = useState<CmsStudioData | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!profile) {
      router.replace('/admin/login');
      return;
    }
    if (profile.role !== 'SUPER_ADMIN') {
      router.replace('/admin/magazines');
      return;
    }

    const loadStudioData = async () => {
      try {
        const res = await fetch('/api/admin/cms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'get-data' }),
        });

        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          const errJson = await res.json().catch(() => ({}));
          setFetchError(errJson.error || 'Failed to initialize Landing Page Studio');
        }
      } catch (err: any) {
        setFetchError(err?.message || 'Network error connecting to studio CMS');
      } finally {
        setIsFetching(false);
      }
    };

    if (token) {
      loadStudioData();
    } else {
      setIsFetching(false);
    }
  }, [profile, token, isLoading, router]);

  if (isLoading || (isFetching && !data)) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] flex items-center justify-center mx-auto font-serif text-lg font-bold animate-pulse shadow-[3px_3px_0px_#1B44B8]">
            S
          </div>
          <p className="text-xs font-mono font-bold text-[#55524D] uppercase tracking-wider">
            Loading Landing Page Studio...
          </p>
        </div>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center p-6">
        <div className="max-w-md w-full border-2 border-[#1A1A1A] bg-[#FAF7F2] p-8 text-center space-y-4 shadow-[4px_4px_0px_#1A1A1A]">
          <h2 className="font-serif text-xl font-bold text-[#1A1A1A]">Studio Initialization Error</h2>
          <p className="text-xs text-rose-700 font-mono">{fetchError || 'Unable to load configuration'}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-white text-xs font-mono font-bold uppercase cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return <StudioShell initialData={data} />;
}
