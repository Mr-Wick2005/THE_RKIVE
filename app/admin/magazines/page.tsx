'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/admin/admin-auth-context';
import { AdminHeader } from '@/components/layout/admin-header';
import { AdminPublicationsHeader } from '@/components/admin/admin-publications-header';
import { PublicationTable } from '@/components/admin/publication-table';

export default function AdminMagazinesListPage() {
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

    const loadMagazines = async () => {
      try {
        const res = await fetch('/api/admin/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'magazines' }),
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          router.replace('/admin/login');
        }
      } catch (err) {
        console.error('Failed to load magazines data:', err);
      } finally {
        setIsFetching(false);
      }
    };

    if (token) {
      loadMagazines();
    }
  }, [profile, token, isLoading, router]);

  if (isLoading || isFetching || !profile || !data) {
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

  const isSuper = profile.role === 'SUPER_ADMIN';
  const { department, magazines } = data;

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
