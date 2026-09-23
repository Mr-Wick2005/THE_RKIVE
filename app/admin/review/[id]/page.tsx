'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/admin/admin-auth-context';
import { AdminHeader } from '@/components/layout/admin-header';
import { ReviewWorkspace } from '@/components/admin/review-workspace';

export default function AdminReviewDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { profile, token, isLoading } = useAdminAuth();
  const [data, setData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!profile) {
      router.replace('/admin/login');
      return;
    }
    if (profile.role !== 'SUPER_ADMIN') {
      router.replace('/admin/dashboard');
      return;
    }

    const loadData = async () => {
      try {
        const res = await fetch('/api/admin/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'review-detail', id: params.id }),
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          router.replace('/admin/review');
        }
      } catch (err) {
        console.error('Failed to load review detail data:', err);
      } finally {
        setIsFetching(false);
      }
    };

    if (token) {
      loadData();
    }
  }, [profile, token, isLoading, params.id, router]);

  if (isLoading || isFetching || !profile || !data) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-sm bg-[#171717] text-[#F8F6F1] flex items-center justify-center mx-auto font-serif text-base font-semibold animate-pulse">
            M
          </div>
          <p className="text-xs font-mono text-[#77736C]">Loading Review Workspace...</p>
        </div>
      </div>
    );
  }

  const { magazine } = data;

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <AdminHeader profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <ReviewWorkspace magazine={magazine} />
      </main>
    </div>
  );
}
