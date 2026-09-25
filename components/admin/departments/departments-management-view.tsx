'use client';

import React, { useState } from 'react';
import { DepartmentWithStats } from '@/types/department';
import { DepartmentStats } from './department-stats';
import { DepartmentsTable } from './departments-table';
import { DepartmentModal } from './department-modal';
import { DeleteDepartmentDialog } from './delete-department-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, Building2, CheckCircle2 } from 'lucide-react';

interface DepartmentsManagementViewProps {
  initialDepartments: DepartmentWithStats[];
}

export function DepartmentsManagementView({
  initialDepartments,
}: DepartmentsManagementViewProps) {
  const [departments, setDepartments] = useState<DepartmentWithStats[]>(initialDepartments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentWithStats | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<DepartmentWithStats | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const refreshDepartments = async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) return;

      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: 'departments' }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.departments) {
          setDepartments(json.departments);
        }
      }
    } catch (err) {
      console.error('Failed to refresh departments list:', err);
    }
  };

  const handleOpenCreate = () => {
    setEditingDepartment(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentWithStats) => {
    setEditingDepartment(dept);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (dept: DepartmentWithStats) => {
    setDeletingDepartment(dept);
  };

  const handleModalSuccess = () => {
    const isEdit = Boolean(editingDepartment);
    setSuccessBanner(
      isEdit
        ? 'Department details were updated successfully and synced across the archive.'
        : 'New academic department was created successfully and is now active.'
    );
    setTimeout(() => setSuccessBanner(null), 5000);
    refreshDepartments();
  };

  const handleDeleteSuccess = () => {
    setSuccessBanner('Department was permanently removed from the institutional registry.');
    setTimeout(() => setSuccessBanner(null), 5000);
    refreshDepartments();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#171717]">
            Academic Department Registry
          </h1>
          <p className="text-xs sm:text-sm text-[#77736C] mt-1">
            Manage college departments, abbreviations, and publishing jurisdictions across the public archive.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-[#171717] hover:bg-[#33312E] text-white text-xs gap-1.5 shadow-xs cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#B58A55]" />
          <span>Add Department</span>
        </Button>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 rounded-sm bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-mono font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Statistics */}
      <DepartmentStats departments={departments} />

      {/* Departments Table */}
      <DepartmentsTable
        departments={departments}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      {/* Create / Edit Modal */}
      <DepartmentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDepartment(null);
        }}
        department={editingDepartment}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDepartmentDialog
        isOpen={Boolean(deletingDepartment)}
        onClose={() => setDeletingDepartment(null)}
        department={deletingDepartment}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
