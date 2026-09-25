import React from 'react';
import { Department } from '@/types/department';
import { Badge } from '@/components/ui/badge';

interface DepartmentMastheadProps {
  department: Department;
  publicationCount: number;
}

export function DepartmentMasthead({
  department,
  publicationCount,
}: DepartmentMastheadProps) {
  return (
    <header className="cutout-card cutout-card-tape p-8 sm:p-12 mb-12 shadow-[8px_8px_0px_#1A1A1A] hover:shadow-[12px_12px_0px_#C24A26] border-2 border-[#1A1A1A] transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3.5 max-w-3xl">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-mono font-bold px-3.5 py-1.5 bg-[#EAE3D7] text-[#1A1A1A] border-2 border-[#1A1A1A]">
              {department.short_name}
            </span>
            <Badge variant="outline" className="text-xs sm:text-sm font-semibold">
              Academic Faculty
            </Badge>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#1A1A1A]">
            {department.name}
          </h1>

          <p className="text-base sm:text-lg text-[#3E3C38] leading-relaxed font-normal">
            {department.description ||
              'Departmental research proceedings, annual periodicals, and student engineering capstone showcases.'}
          </p>
        </div>

        {/* Publication Count Box */}
        <div className="p-6 bg-[#EAE3D7] border-2 border-[#1A1A1A] text-center min-w-[200px] flex-shrink-0 shadow-[4px_4px_0px_#1A1A1A]">
          <span className="block font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A]">
            {publicationCount}
          </span>
          <span className="text-xs sm:text-sm uppercase font-mono font-bold tracking-wider text-[#1A1A1A] mt-1 block">
            {publicationCount === 1 ? 'Published Issue' : 'Published Issues'}
          </span>
        </div>
      </div>
    </header>
  );
}
