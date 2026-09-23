'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileWithDepartment } from '@/types/auth';
import { Department } from '@/types/department';
import { toggleUserStatusAction, updateUserDepartmentAction } from '@/app/actions/users';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import {
  Search,
  Shield,
  Building2,
  CheckCircle2,
  XCircle,
  MoreVertical,
  UserCheck,
  UserX,
  Edit3,
} from 'lucide-react';

interface UsersTableProps {
  initialUsers: ProfileWithDepartment[];
  departments: Department[];
  currentUserId: string;
}

export function UsersTable({
  initialUsers,
  departments,
  currentUserId,
}: UsersTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'SUPER_ADMIN' | 'DEPARTMENT_ADMIN'>('ALL');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [editingDeptUserId, setEditingDeptUserId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  const filteredUsers = initialUsers.filter((user) => {
    if (roleFilter !== 'ALL' && user.role !== roleFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = user.full_name.toLowerCase().includes(q);
      const emailMatch = user.email.toLowerCase().includes(q);
      const deptMatch = user.department?.name.toLowerCase().includes(q);
      if (!nameMatch && !emailMatch && !deptMatch) {
        return false;
      }
    }

    return true;
  });

  const handleToggleStatus = async (userId: string, currentStatus: boolean, fullName: string) => {
    const actionName = currentStatus ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${actionName} administrator "${fullName}"?`)) {
      return;
    }

    setIsUpdating(userId);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      await toggleUserStatusAction(userId, !currentStatus, session?.access_token);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSaveDepartment = async (userId: string) => {
    if (!selectedDeptId) return;
    setIsUpdating(userId);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      await updateUserDepartmentAction(userId, selectedDeptId, session?.access_token);
      setEditingDeptUserId(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-sm border border-[#E8E2D8]">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#77736C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or department..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F8F6F1] border border-[#E8E2D8] rounded-sm text-xs text-[#171717] placeholder:text-[#77736C] focus:outline-none focus:ring-1 focus:ring-[#171717]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-1.5 bg-[#F8F6F1] border border-[#E8E2D8] rounded-sm text-xs text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admins</option>
            <option value="DEPARTMENT_ADMIN">Department Admins</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#E8E2D8] rounded-sm overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E8E2D8] bg-[#F8F6F1] text-[11px] font-mono uppercase tracking-wider text-[#77736C]">
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Assigned Department</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E2D8] text-xs">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-[#77736C]">
                  No editorial users found matching the filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                const isSuper = user.role === 'SUPER_ADMIN';

                return (
                  <tr key={user.id} className="hover:bg-[#FDFBF7] transition-colors">
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-[#171717] block">
                          {user.full_name} {isSelf && <span className="text-[10px] text-[#B58A55] font-mono">(You)</span>}
                        </span>
                        <span className="text-[11px] font-mono text-[#77736C]">
                          {user.email}
                        </span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={isSuper ? 'gold' : 'department'}
                        className="text-[10px]"
                      >
                        {isSuper ? 'Super Admin' : 'Department Admin'}
                      </Badge>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      {isSuper ? (
                        <span className="text-[#77736C] font-mono text-[11px]">
                          College Wide (All)
                        </span>
                      ) : editingDeptUserId === user.id ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                            className="px-2 py-1 bg-white border border-[#171717] rounded-xs text-xs text-[#171717]"
                          >
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="text-[10px] py-1 px-2 bg-[#171717] text-white"
                            onClick={() => handleSaveDepartment(user.id)}
                            disabled={isUpdating === user.id}
                          >
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] py-1 px-2"
                            onClick={() => setEditingDeptUserId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[#171717]">
                          <Building2 className="w-3.5 h-3.5 text-[#77736C]" />
                          <span>{user.department?.name || 'Unassigned'}</span>
                          <button
                            onClick={() => {
                              setEditingDeptUserId(user.id);
                              setSelectedDeptId(user.department_id || departments[0]?.id || '');
                            }}
                            className="text-[#77736C] hover:text-[#171717] p-1 transition-colors"
                            title="Reassign Department"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-100 text-stone-600 border border-stone-300">
                          <XCircle className="w-3 h-3" />
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#77736C]">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => handleToggleStatus(user.id, user.is_active, user.full_name)}
                          disabled={isUpdating === user.id}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs font-medium border transition-colors ${
                            user.is_active
                              ? 'border-rose-300 text-rose-700 hover:bg-rose-50'
                              : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                          }`}
                        >
                          {user.is_active ? (
                            <>
                              <UserX className="w-3 h-3" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
