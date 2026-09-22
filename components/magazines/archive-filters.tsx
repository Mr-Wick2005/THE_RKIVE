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
    <div className="bg-white border border-[#E8E2D8] rounded-sm p-4 sm:p-6 mb-10 shadow-sm space-y-4">
      {/* Top Search & Clear */}
      <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#77736C]" />
          <input
            type="text"
            placeholder="Search by publication title, topic, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-sm border border-[#E8E2D8] text-sm text-[#171717] placeholder:text-[#9A958E] focus:outline-none focus:border-[#171717] focus:ring-1 focus:ring-[#171717] transition-all bg-[#F8F6F1]/50 focus:bg-white"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="h-11 px-5 rounded-sm bg-[#171717] text-[#F8F6F1] text-xs font-semibold uppercase tracking-wider hover:bg-[#2C2C2A] transition-all flex-shrink-0"
        >
          {isPending ? 'Searching...' : 'Search Archive'}
        </button>
      </form>

      {/* Filter Selectors Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#F0EBE1] text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Select */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-dept" className="text-[#77736C] font-mono text-[11px] uppercase">
              Dept:
            </label>
            <select
              id="filter-dept"
              value={currentDept || 'all'}
              onChange={(e) => updateFilters({ department: e.target.value })}
              className="h-9 px-3 rounded-sm border border-[#E8E2D8] bg-white text-[#171717] text-xs focus:outline-none focus:border-[#171717]"
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
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-year" className="text-[#77736C] font-mono text-[11px] uppercase">
              Year:
            </label>
            <select
              id="filter-year"
              value={currentYear || 'all'}
              onChange={(e) => updateFilters({ year: e.target.value })}
              className="h-9 px-3 rounded-sm border border-[#E8E2D8] bg-white text-[#171717] text-xs focus:outline-none focus:border-[#171717]"
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
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#77736C]" />
            <select
              id="filter-sort"
              value={currentSort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className="h-9 px-3 rounded-sm border border-[#E8E2D8] bg-white text-[#171717] text-xs focus:outline-none focus:border-[#171717]"
            >
              <option value="latest">Latest Published</option>
              <option value="oldest">Oldest First</option>
              <option value="title_asc">Title (A–Z)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 h-9 px-2.5 text-xs text-rose-700 hover:bg-rose-50 rounded-sm border border-transparent hover:border-rose-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
