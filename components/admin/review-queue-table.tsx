'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MagazineWithRelations,
  MagazineStatus,
  MAGAZINE_STATUS_LABELS,
  MAGAZINE_STATUS_COLORS,
} from '@/types/magazine';
import { PublicationStatusBadge } from '@/components/admin/publication-status-badge';
import { ProcessingStatusBadge } from '@/components/admin/processing-status-badge';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Eye,
  Building2,
  Calendar,
  Layers,
  FileCheck2,
  Inbox,
  Filter,
} from 'lucide-react';
import { formatDate, formatTimeAgo } from '@/lib/utils';

interface ReviewQueueTableProps {
  initialMagazines: MagazineWithRelations[];
}

type TabFilter = 'ALL' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';

export function ReviewQueueTable({ initialMagazines }: ReviewQueueTableProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>('SUBMITTED');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Extract unique departments for filtering
  const departments = Array.from(
    new Map(
      initialMagazines
        .filter((m) => m.department)
        .map((m) => [m.department!.id, m.department!])
    ).values()
  );

  // Tab counts
  const counts = {
    ALL: initialMagazines.length,
    SUBMITTED: initialMagazines.filter((m) => m.status === 'SUBMITTED').length,
    UNDER_REVIEW: initialMagazines.filter((m) => m.status === 'UNDER_REVIEW').length,
    APPROVED: initialMagazines.filter((m) => m.status === 'APPROVED').length,
    PUBLISHED: initialMagazines.filter((m) => m.status === 'PUBLISHED').length,
    REJECTED: initialMagazines.filter((m) => m.status === 'REJECTED').length,
  };

  const filteredMagazines = initialMagazines.filter((magazine) => {
    // Tab status match
    if (activeTab !== 'ALL' && magazine.status !== activeTab) {
      return false;
    }

    // Department match
    if (deptFilter !== 'ALL' && magazine.department_id !== deptFilter) {
      return false;
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = magazine.title.toLowerCase().includes(q);
      const deptMatch = magazine.department?.name?.toLowerCase().includes(q);
      const yearMatch = magazine.academic_year.toLowerCase().includes(q);
      if (!titleMatch && !deptMatch && !yearMatch) {
        return false;
      }
    }

    return true;
  });

  const tabs: { id: TabFilter; label: string; count: number }[] = [
    { id: 'SUBMITTED', label: 'Review Queue', count: counts.SUBMITTED },
    { id: 'UNDER_REVIEW', label: 'Under Review', count: counts.UNDER_REVIEW },
    { id: 'APPROVED', label: 'Approved (Ready)', count: counts.APPROVED },
    { id: 'PUBLISHED', label: 'Published', count: counts.PUBLISHED },
    { id: 'REJECTED', label: 'Needs Revision', count: counts.REJECTED },
    { id: 'ALL', label: 'All Submissions', count: counts.ALL },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-[#E8E2D8] flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#171717] text-[#171717] font-semibold'
                  : 'border-transparent text-[#77736C] hover:text-[#171717] hover:border-[#E8E2D8]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id
                    ? 'bg-[#171717] text-[#F8F6F1]'
                    : 'bg-[#F8F6F1] text-[#77736C]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-sm border border-[#E8E2D8]">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#77736C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by publication or department..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#F8F6F1] border border-[#E8E2D8] rounded-sm text-xs text-[#171717] placeholder:text-[#77736C] focus:outline-none focus:ring-1 focus:ring-[#171717]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#77736C]" />
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 bg-[#F8F6F1] border border-[#E8E2D8] rounded-sm text-xs text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table / List */}
      {filteredMagazines.length === 0 ? (
        <div className="bg-white border border-[#E8E2D8] rounded-sm p-12 text-center">
          <Inbox className="w-10 h-10 text-[#77736C] mx-auto mb-3 stroke-[1.5]" />
          <h3 className="font-serif text-base font-semibold text-[#171717]">
            No publications in this queue
          </h3>
          <p className="text-xs text-[#77736C] mt-1 max-w-sm mx-auto">
            {activeTab === 'SUBMITTED'
              ? 'There are currently no new departmental submissions waiting for review.'
              : 'No matching publications found for the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#E8E2D8] rounded-sm overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E2D8] bg-[#F8F6F1] text-[11px] font-mono uppercase tracking-wider text-[#77736C]">
                <th className="py-3 px-4">Publication</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Academic Year</th>
                <th className="py-3 px-4">Pages / Status</th>
                <th className="py-3 px-4">Updated</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D8] text-xs">
              {filteredMagazines.map((mag) => {
                return (
                  <tr
                    key={mag.id}
                    className="hover:bg-[#FDFBF7] transition-colors group"
                  >
                    {/* Cover & Title */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 bg-stone-100 border border-[#E8E2D8] rounded-xs overflow-hidden shrink-0 relative">
                          {mag.cover_image_url ? (
                            <Image
                              src={mag.cover_image_url}
                              alt={mag.title}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-[#77736C]">
                              Cover
                            </div>
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/admin/review/${mag.id}`}
                            className="font-serif font-semibold text-[#171717] hover:text-[#B58A55] transition-colors block line-clamp-1"
                          >
                            {mag.title}
                          </Link>
                          {mag.subtitle && (
                            <p className="text-[11px] text-[#77736C] line-clamp-1">
                              {mag.subtitle}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <PublicationStatusBadge status={mag.status} />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-[#171717]">
                        <Building2 className="w-3.5 h-3.5 text-[#77736C] shrink-0" />
                        <span className="font-medium">
                          {mag.department?.name || 'College Wide'}
                        </span>
                      </div>
                    </td>

                    {/* Academic Year */}
                    <td className="py-3.5 px-4 font-mono text-[#44423E]">
                      {mag.academic_year}
                      {mag.edition && (
                        <span className="block text-[10px] text-[#77736C]">
                          {mag.edition}
                        </span>
                      )}
                    </td>

                    {/* Pages & Processing */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[#44423E]">
                          <Layers className="w-3 h-3 text-[#77736C]" />
                          <span>{mag.page_count || 0} pages</span>
                        </div>
                        <ProcessingStatusBadge status={mag.processing_status} />
                      </div>
                    </td>

                    {/* Updated */}
                    <td className="py-3.5 px-4 text-[#77736C] font-mono text-[11px]">
                      {formatTimeAgo(mag.updated_at)}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/review/${mag.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#171717] text-[#F8F6F1] hover:bg-[#33312E] rounded-sm text-xs font-medium transition-colors shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
