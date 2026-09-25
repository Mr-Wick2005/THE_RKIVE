'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, SlidersHorizontal, X, ArrowUpDown } from 'lucide-react';
import { Department } from '@/types/department';

interface ArchiveFiltersProps {
  departments: Department[];
  academicYears: string[];
}

export function ArchiveFilters({ departments, academicYears }: ArchiveFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get('q') || '';
  const currentDept = searchParams.get('department') || '';
  const currentYear = searchParams.get('year') || '';
  const currentSort = searchParams.get('sort') || 'latest';

  const [searchQuery, setSearchQuery] = useState(currentSearch);

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === 'all' || (key === 'sort' && value === 'latest')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchQuery.trim() });
  };

  const clearFilters = () => {
    setSearchQuery('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  const hasActiveFilters = Boolean(currentSearch || currentDept || currentYear || (currentSort && currentSort !== 'latest'));

  return (
    <div className="cutout-card p-4 sm:p-6 mb-10 shadow-[6px_6px_0px_#1A1A1A] border-2 border-[#1A1A1A] space-y-4">
      {/* Top Search & Clear */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]" />
          <input
            type="text"
            placeholder="Search by publication title, topic, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-none border-2 border-[#1A1A1A] text-base text-[#1A1A1A] placeholder:text-[#706B62] focus:outline-none focus:bg-[#FAF7F2] transition-all bg-[#EAE3D7]"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="h-12 px-6 rounded-none bg-[#1A1A1A] text-[#FAF7F2] text-sm font-semibold uppercase tracking-wider hover:bg-[#1B44B8] border-2 border-[#1A1A1A] hover:border-[#1B44B8] shadow-[2px_2px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_#1B44B8] transition-all flex-shrink-0"
        >
          {isPending ? 'Searching...' : 'Search Archive'}
        </button>
      </form>

      {/* Filter Selectors Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#1A1A1A]/15 text-sm sm:text-base">
        <div className="flex flex-wrap items-center gap-4">
          {/* Department Select */}
          <div className="flex items-center gap-2">
            <label htmlFor="filter-dept" className="text-[#1A1A1A] font-mono text-xs sm:text-sm font-bold uppercase">
              Dept:
            </label>
            <select
              id="filter-dept"
              value={currentDept || 'all'}
              onChange={(e) => updateFilters({ department: e.target.value })}
              className="h-10 px-3.5 rounded-none border-2 border-[#1A1A1A] bg-[#EAE3D7] text-[#1A1A1A] font-medium text-sm focus:outline-none focus:bg-[#FAF7F2]"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.slug}>
                  {d.name} ({d.short_name})
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Select */}
          <div className="flex items-center gap-2">
            <label htmlFor="filter-year" className="text-[#1A1A1A] font-mono text-xs sm:text-sm font-bold uppercase">
              Year:
            </label>
            <select
              id="filter-year"
              value={currentYear || 'all'}
              onChange={(e) => updateFilters({ year: e.target.value })}
              className="h-10 px-3.5 rounded-none border-2 border-[#1A1A1A] bg-[#EAE3D7] text-[#1A1A1A] font-medium text-sm focus:outline-none focus:bg-[#FAF7F2]"
            >
              <option value="all">All Academic Years</option>
              {academicYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort Order & Reset */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-[#C24A26]" />
            <select
              id="filter-sort"
              value={currentSort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="h-10 px-3.5 rounded-none border-2 border-[#1A1A1A] bg-[#EAE3D7] text-[#1A1A1A] font-medium text-sm focus:outline-none focus:bg-[#FAF7F2]"
            >
              <option value="latest">Latest Published</option>
              <option value="oldest">Oldest First</option>
              <option value="title_asc">Title (A–Z)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 h-10 px-3 text-sm font-semibold text-rose-800 hover:bg-rose-100 rounded-none border-2 border-rose-800 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
