'use client';

import React from 'react';
import { DepartmentWithStats } from '@/types/department';
import { Building2, CheckCircle2, BookOpen, Layers } from 'lucide-react';

interface DepartmentStatsProps {
  departments: DepartmentWithStats[];
}

export function DepartmentStats({ departments }: DepartmentStatsProps) {
  const total = departments.length;
  const active = departments.filter((d) => d.is_active).length;
  const withPublications = departments.filter((d) => (d.magazine_count || 0) > 0).length;
  const totalMagazines = departments.reduce((acc, d) => acc + (d.magazine_count || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Departments */}
      <div className="border border-[#E8E2D8] bg-white rounded-sm p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#77736C]">
            Total Departments
          </span>
          <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-blue-50 text-blue-800">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#171717]">
            {total}
          </span>
          <p className="text-[11px] text-[#77736C] font-light mt-0.5">
            Registered academic faculties
          </p>
        </div>
      </div>

      {/* Active Publishing Units */}
      <div className="border border-[#E8E2D8] bg-white rounded-sm p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#77736C]">
            Active Units
          </span>
          <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-emerald-50 text-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#171717]">
            {active}
          </span>
          <p className="text-[11px] text-[#77736C] font-light mt-0.5">
            Enabled for public display & upload
          </p>
        </div>
      </div>

      {/* Departments with Archive */}
      <div className="border border-[#E8E2D8] bg-white rounded-sm p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#77736C]">
            Active Archives
          </span>
          <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-amber-50 text-amber-800">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#171717]">
            {withPublications}
          </span>
          <p className="text-[11px] text-[#77736C] font-light mt-0.5">
            Departments with published issues
          </p>
        </div>
      </div>

      {/* Total Published Publications */}
      <div className="border border-[#E8E2D8] bg-white rounded-sm p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#77736C]">
            Archived Issues
          </span>
          <div className="w-7 h-7 rounded-sm flex items-center justify-center bg-purple-50 text-purple-800">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-[#171717]">
            {totalMagazines}
          </span>
          <p className="text-[11px] text-[#77736C] font-light mt-0.5">
            Total live magazine editions
          </p>
        </div>
      </div>
    </div>
  );
}
