import React from 'react';
import { requireSuperAdmin } from '@/lib/auth/permissions';
import { getEditorialUsers, getEditorialUserStats } from '@/lib/auth/bootstrap';
import { getActiveDepartments } from '@/lib/departments';
import { AdminHeader } from '@/components/layout/admin-header';
import { UsersManagementView } from '@/components/admin/users/users-management-view';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'User Management | College Editorial Desk',
  description: 'Super Admin management of college editorial users and department administrators.',
};

export default async function AdminUsersPage() {
  const { profile } = await requireSuperAdmin();

  const [users, stats, departments] = await Promise.all([
    getEditorialUsers(),
    getEditorialUserStats(),
    getActiveDepartments(),
  ]);

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col">
      <AdminHeader profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <UsersManagementView
          initialUsers={users}
          departments={departments}
          currentUserId={profile.id}
          stats={stats}
        />
      </main>
    </div>
  );
}
