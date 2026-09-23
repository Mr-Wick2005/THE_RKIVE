'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/admin/admin-auth-context';
import { AdminHeader } from '@/components/layout/admin-header';
import { PublicationForm } from '@/components/admin/publication-form';

export default function NewPublicationPage() {
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
          body: JSON.stringify({ action: 'new-publication' }),
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          router.replace('/admin/login');
        }
      } catch (err) {
        console.error('Failed to load new publication data:', err);
      } finally {
        setIsFetching(false);
      }
    };

    if (token) {
      loadData();
    }
  }, [profile, token, isLoading, router]);

  if (isLoading || isFetching || !profile || !data) {
    return (
      <div className="min-h-screen bg-[#F8F6F1] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-sm bg-[#171717] text-[#F8F6F1] flex items-center justify-center mx-auto font-serif text-base font-semibold animate-pulse">
            M
          </div>
          <p className="text-xs font-mono text-[#77736C]">Loading Editor...</p>
        </div>
      </div>
    );
  }

  const isSuper = profile.role === 'SUPER_ADMIN';
  const { department, departments } = data;

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <AdminHeader profile={profile} department={department} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-10 space-y-8">
        {/* Breadcrumbs & Header */}
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
            <span className="text-[#171717] font-semibold">New Publication</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-medium tracking-tight text-[#171717]">
                Create New Digital Magazine
              </h1>
              <p className="text-xs sm:text-sm text-[#77736C] font-light leading-relaxed mt-1">
                Enter archival metadata, upload cover artwork and publication PDF, and save as a department draft or submit directly for college review.
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Section Publication Form */}
        <PublicationForm
          department={department}
          isSuperAdmin={isSuper}
          departments={departments}
        />
      </main>
    </div>
  );
}
