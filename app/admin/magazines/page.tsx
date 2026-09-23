'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/components/admin/admin-auth-context';
import { AdminHeader } from '@/components/layout/admin-header';
import { PublicationTable } from '@/components/admin/publication-table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

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
        {/* Breadcrumb & Header */}
        <div className="border-b border-[#E8E2D8] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#77736C]">
              <Link href="/admin/dashboard" className="hover:text-[#171717] transition-colors">
                Workspace
              </Link>
              <span>/</span>
              <span className="text-[#171717] font-semibold">Publications</span>
            </div>

            <h1 className="font-serif text-3xl font-medium tracking-tight text-[#171717]">
              {isSuper ? 'Institutional Publications Registry' : `${department?.name || 'Department'} Publications`}
            </h1>
            <p className="text-xs text-[#77736C] font-light">
              Manage draft editions, track review status, and prepare publications for college publication.
            </p>
          </div>

          <Link href="/admin/magazines/new">
            <Button variant="primary" size="md" className="gap-2 bg-[#171717] hover:bg-[#2C2C2A] shadow-sm">
              <PlusCircle className="w-4 h-4 text-[#B58A55]" />
              <span>Create Publication</span>
            </Button>
          </Link>
        </div>

        {/* Management Table */}
        <PublicationTable magazines={magazines} />
      </main>
    </div>
  );
}
