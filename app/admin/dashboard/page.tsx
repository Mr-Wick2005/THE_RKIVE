import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/permissions';
import { getDepartmentsWithStats } from '@/lib/departments';
import { getDepartmentPublicationStats, getMyDepartmentMagazines } from '@/lib/magazines/admin';
import { getEditorialUserStats } from '@/lib/auth/bootstrap';
import { AdminHeader } from '@/components/layout/admin-header';
import { SuperAdminOverview } from '@/components/admin/super-admin-overview';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Executive Dashboard | College Super Admin Desk',
  description: 'Global editorial governance, review desk, and publication stats.',
};

export default async function AdminDashboardPage() {
  const { profile } = await requireAuth();

  // Strictly enforce SUPER_ADMIN access on /admin/dashboard
  // Department Admins are routed to their publications workspace (/admin/magazines)
  if (profile.role !== 'SUPER_ADMIN') {
    redirect('/admin/magazines');
  }

  const [stats, departments, userStats, recentSubmissions] = await Promise.all([
    getDepartmentPublicationStats(profile),
    getDepartmentsWithStats(),
    getEditorialUserStats(),
    getMyDepartmentMagazines(profile),
  ]);

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <AdminHeader profile={profile} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-10 py-10">
        <SuperAdminOverview
          stats={stats}
          departments={departments}
          userStats={userStats}
          recentSubmissions={recentSubmissions}
        />
      </main>
    </div>
  );
}
