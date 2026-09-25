'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { DepartmentWithStats } from '@/types/department';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  Building2,
  Edit2,
  Trash2,
  ExternalLink,
  BookOpen,
  Layers,
} from 'lucide-react';

interface DepartmentsTableProps {
  departments: DepartmentWithStats[];
  onEdit: (dept: DepartmentWithStats) => void;
  onDelete: (dept: DepartmentWithStats) => void;
}

export function DepartmentsTable({
  departments,
  onEdit,
  onDelete,
}: DepartmentsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDepartments = departments.filter((d) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      d.name.toLowerCase().includes(query) ||
      d.short_name.toLowerCase().includes(query) ||
      d.slug.toLowerCase().includes(query) ||
      (d.description && d.description.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-sm border border-[#E8E2D8] shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#77736C]" />
          <input
            type="text"
            placeholder="Search departments by name, abbreviation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#F8F6F1] border border-[#E8E2D8] rounded-sm text-xs text-[#171717] placeholder:text-[#9E9A90] focus:outline-none focus:ring-1 focus:ring-[#171717]"
          />
        </div>

        <div className="text-[11px] font-mono text-[#77736C] self-end sm:self-center">
          Showing <strong>{filteredDepartments.length}</strong> of{' '}
          <strong>{departments.length}</strong> departments
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-sm border border-[#E8E2D8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E2D8] bg-[#F8F6F1] text-[10px] font-mono uppercase tracking-widest text-[#77736C]">
                <th className="py-3 px-4 font-semibold">Department</th>
                <th className="py-3 px-4 font-semibold text-center">Abbr</th>
                <th className="py-3 px-4 font-semibold text-center">Public Issues</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D8] text-xs">
              {filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#77736C]">
                    <Building2 className="w-8 h-8 text-[#B58A55] mx-auto mb-2 opacity-50" />
                    <p className="font-serif text-sm font-medium text-[#171717]">
                      No matching academic departments found
                    </p>
                    <p className="text-xs text-[#77736C] mt-1 font-mono">
                      {searchQuery
                        ? 'Try modifying your search query.'
                        : 'Click "+ Add Department" above to create one.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept) => {
                  const issueCount = dept.magazine_count || 0;
                  return (
                    <tr
                      key={dept.id}
                      className="hover:bg-[#FDFBF7] transition-colors group"
                    >
                      {/* Department Name & Description */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-sm bg-[#F4EFEB] border border-[#1A1A1A]/15 text-[#1A1A1A] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 font-mono shadow-2xs">
                            {dept.short_name.slice(0, 3)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-serif font-bold text-sm text-[#171717] group-hover:text-[#1B44B8] transition-colors block">
                              {dept.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#77736C] font-mono">
                              <span>Slug: /{dept.slug}</span>
                              {dept.latest_magazine_year && (
                                <>
                                  <span>•</span>
                                  <span>Latest: {dept.latest_magazine_year}</span>
                                </>
                              )}
                            </div>
                            {dept.description && (
                              <p className="text-[11px] text-[#55524D] mt-1 line-clamp-1 font-light max-w-md">
                                {dept.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Abbreviation Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 font-mono font-bold text-xs bg-[#EAE3D7] text-[#1A1A1A] border border-[#1A1A1A]/20 shadow-2xs">
                          {dept.short_name}
                        </span>
                      </td>

                      {/* Issues Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded-xs border ${
                            issueCount > 0
                              ? 'bg-blue-50 text-blue-900 border-blue-200'
                              : 'bg-stone-50 text-stone-600 border-stone-200'
                          }`}
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>{issueCount} {issueCount === 1 ? 'issue' : 'issues'}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-xs border ${
                            dept.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/department/${dept.slug}`}
                            target="_blank"
                            title="View public department page"
                            className="p-1.5 rounded-sm border border-[#E8E2D8] text-[#77736C] hover:text-[#171717] hover:bg-[#F8F6F1] transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => onEdit(dept)}
                            title="Edit department details"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm border border-[#E8E2D8] bg-white text-[#171717] hover:bg-[#F8F6F1] hover:border-[#171717] transition-colors text-xs font-medium cursor-pointer shadow-2xs"
                          >
                            <Edit2 className="w-3 h-3 text-[#1B44B8]" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDelete(dept)}
                            title="Delete department"
                            className="p-1.5 rounded-sm border border-[#E8E2D8] text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
