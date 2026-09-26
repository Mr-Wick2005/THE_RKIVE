'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/admin/admin-auth-context';
import { AdminHeader } from '@/components/layout/admin-header';
import { PublicationForm } from '@/components/admin/publication-form';
import { PublicationStatusBadge } from '@/components/admin/publication-status-badge';

export default function EditPublicationPage({ params }: { params: { id: string } }) {
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

    const loadData = async () => {
      try {
        const res = await fetch('/api/admin/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: 'edit-publication', id: params.id }),
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          router.replace('/admin/magazines');
        }
      } catch (err) {
        console.error('Failed to load publication data:', err);
      } finally {
        setIsFetching(false);
      }
    };

    if (token) {
      loadData();
    } else {
      setIsFetching(false);
    }
  }, [profile, token, isLoading, params.id, router]);

  if (isLoading || (isFetching && !data)) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-sm bg-[#171717] text-[#F8F6F1] flex items-center justify-center mx-auto font-serif text-base font-semibold animate-pulse">
            M
          </div>
          <p className="text-xs font-mono text-[#77736C]">Loading Publication Editor...</p>
        </div>
      </div>
    );
  }

  if (!profile || !data) {
    return null;
  }

  const isSuper = profile.role === 'SUPER_ADMIN';
  const { magazine, department } = data;

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <AdminHeader profile={profile} department={department} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-10 space-y-8">
        {/* Breadcrumb & Header */}
        <div className="border-b border-[#E8E2D8] pb-6 space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#77736C]">
            <Link href="/admin/dashboard" className="hover:text-[#171717] transition-colors">
              Workspace
            </Link>
            <span>/</span>
            <Link href="/admin/magazines" className="hover:text-[#171717] transition-colors">
              Publications
            </Link>
            <span>/</span>
            <span className="text-[#171717] font-semibold">Edit Publication</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-3xl font-medium tracking-tight text-[#171717]">
                  Edit Publication
                </h1>
                <PublicationStatusBadge status={magazine.status} />
              </div>
              <p className="text-xs sm:text-sm text-[#77736C] font-light leading-relaxed mt-1">
                Update editorial metadata, replace cover artwork or PDF document, and save draft revisions.
              </p>
            </div>
          </div>
        </div>

        {/* Publication Form */}
        <PublicationForm
          initialData={magazine}
          department={department}
          isSuperAdmin={isSuper}
        />
      </main>
    </div>
  );
}
