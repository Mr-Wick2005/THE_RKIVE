import React from 'react';
import Link from 'next/link';
import { Department } from '@/types/department';
import { Magazine } from '@/types/magazine';
import { MagazineGrid } from '@/components/magazines/magazine-grid';

interface DepartmentPublicationsSectionProps {
  department: Department;
  magazines: Magazine[];
  currentSort: string;
}

export function DepartmentPublicationsSection({
  department,
  magazines,
  currentSort,
}: DepartmentPublicationsSectionProps) {
  return (
    <section className="space-y-8">
      <div className="border-b border-[#2C2824]/15 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs sm:text-sm font-mono uppercase tracking-widest font-bold text-[#8C2C14] block">
            Official Catalog
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#121210] mt-1">
            Departmental Publications ({magazines.length})
          </h2>
        </div>

        {/* Simple Sort Options */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#2E2B26] font-mono text-xs sm:text-sm uppercase font-bold">Sort:</span>
          <Link
            href={`/department/${department.slug}?sort=latest`}
            className={`px-3 py-1.5 rounded-xs border text-sm font-semibold transition-colors ${
              currentSort === 'latest'
                ? 'bg-[#121210] text-[#FAF7F2] border-[#121210]'
                : 'bg-[#FFFFFF] text-[#2E2B26] border-[#2C2824]/20 hover:bg-[#F5EFEB]'
            }`}
          >
            Latest
          </Link>
          <Link
            href={`/department/${department.slug}?sort=oldest`}
            className={`px-3 py-1.5 rounded-xs border text-sm font-semibold transition-colors ${
              currentSort === 'oldest'
                ? 'bg-[#121210] text-[#FAF7F2] border-[#121210]'
                : 'bg-[#FFFFFF] text-[#2E2B26] border-[#2C2824]/20 hover:bg-[#F5EFEB]'
            }`}
          >
            Oldest
          </Link>
          <Link
            href={`/department/${department.slug}?sort=title_asc`}
            className={`px-3 py-1.5 rounded-xs border text-sm font-semibold transition-colors ${
              currentSort === 'title_asc'
                ? 'bg-[#121210] text-[#FAF7F2] border-[#121210]'
                : 'bg-[#FFFFFF] text-[#2E2B26] border-[#2C2824]/20 hover:bg-[#F5EFEB]'
            }`}
          >
            A–Z
          </Link>
        </div>
      </div>

      <MagazineGrid
        magazines={magazines}
        emptyType="department"
        emptyMessage={`The ${department.name} department has not published an approved digital magazine edition yet.`}
      />
    </section>
  );
}
