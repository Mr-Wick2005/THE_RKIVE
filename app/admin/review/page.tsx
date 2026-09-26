'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/admin/admin-auth-context';
import { AdminHeader } from '@/components/layout/admin-header';
import { ReviewQueueTable } from '@/components/admin/review-queue-table';
import { Shield } from 'lucide-react';

export default function AdminReviewPage() {
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
          body: JSON.stringify({ action: 'review' }),
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          router.replace('/admin/login');
        }
      } catch (err) {
        console.error('Failed to load review data:', err);
      } finally {
        setIsFetching(false);
      }
    };

    if (token) {
      loadData();
    } else {
      setIsFetching(false);
    }
  }, [profile, token, isLoading, router]);

  if (isLoading || (isFetching && !data)) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-sm bg-[#171717] text-[#F8F6F1] flex items-center justify-center mx-auto font-serif text-base font-semibold animate-pulse">
            M
          </div>
          <p className="text-xs font-mono text-[#77736C]">Loading Review Desk...</p>
        </div>
      </div>
    );
  }

  if (!profile || !data) {
    return null;
  }

  const { magazines } = data;

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <AdminHeader profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#B58A55] mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Institutional Governance</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#171717]">
            College Publication Review Desk
          </h1>
          <p className="text-xs sm:text-sm text-[#77736C] mt-1 max-w-2xl">
            Evaluate, approve, or request revisions on departmental digital magazine submissions before publishing to the institutional digital archive.
          </p>
        </div>

        {/* Review Queue Component */}
        <ReviewQueueTable initialMagazines={magazines} />
      </main>
    </div>
  );
}
