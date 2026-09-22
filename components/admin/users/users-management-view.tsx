'use client';

import React, { useState } from 'react';
import { ProfileWithDepartment } from '@/types/auth';
import { Department } from '@/types/department';
import { UsersTable } from './users-table';
import { UserStats } from './user-stats';
import { CreateUserModal } from './create-user-modal';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

interface UsersManagementViewProps {
  initialUsers: ProfileWithDepartment[];
  departments: Department[];
  currentUserId: string;
  stats: {
    total: number;
    superAdmins: number;
    departmentAdmins: number;
    active: number;
    inactive: number;
  };
}

export function UsersManagementView({
  initialUsers,
  departments,
  currentUserId,
  stats,
}: UsersManagementViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Bar with Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#171717]">
            Editorial User Management
          </h1>
          <p className="text-xs sm:text-sm text-[#77736C] mt-1">
            Provision and manage authorized Department Administrators and College Super Administrators.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#171717] hover:bg-[#33312E] text-white text-xs gap-1.5 shadow-xs"
        >
          <UserPlus className="w-3.5 h-3.5 text-[#B58A55]" />
          <span>Provision Department Admin</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <UserStats stats={stats} />

      {/* Table */}
      <UsersTable
        initialUsers={initialUsers}
        departments={departments}
        currentUserId={currentUserId}
      />

      {/* Modal */}
      <CreateUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        departments={departments}
      />
    </div>
  );
}
