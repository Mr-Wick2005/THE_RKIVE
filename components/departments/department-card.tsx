import React from 'react';
import Link from 'next/link';
import { DepartmentWithStats } from '@/types/department';
import { ChevronRight, BookOpen, Layers } from 'lucide-react';

interface DepartmentCardProps {
  department: DepartmentWithStats;
}

export function DepartmentCard({ department }: DepartmentCardProps) {
  const { name, short_name, slug, description, magazine_count = 0, latest_magazine_year } =
    department;

  return (
    <Link
      href={`/department/${slug}`}
      className="group flex flex-col justify-between p-6 sm:p-7 rounded-sm border border-[#E8E2D8] bg-white hover:border-[#171717] hover:shadow-editorial-lg transition-all duration-300 relative overflow-hidden"
    >
      {/* Top Code Badge & Arrow */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-sm bg-[#F0EBE1] text-[#171717] border border-[#E8E2D8] group-hover:bg-[#171717] group-hover:text-[#F8F6F1] group-hover:border-[#171717] transition-colors">
            {short_name}
          </span>
          <div className="w-7 h-7 rounded-full bg-[#F8F6F1] flex items-center justify-center text-[#77736C] group-hover:bg-[#171717] group-hover:text-[#F8F6F1] group-hover:translate-x-0.5 transition-all">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#171717] group-hover:text-[#B58A55] transition-colors leading-snug">
          {name}
        </h3>

        <p className="text-xs text-[#77736C] mt-2.5 line-clamp-3 leading-relaxed font-light">
          {description ||
            'Departmental capstone periodicals, peer-reviewed engineering proceedings, and annual research digests.'}
        </p>
      </div>

      {/* Bottom Publication Stats */}
      <div className="pt-6 mt-6 border-t border-[#F0EBE1] flex items-center justify-between text-xs text-[#77736C]">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-[#B58A55]" />
          <span className="font-medium text-[#171717]">
            {magazine_count} {magazine_count === 1 ? 'Publication' : 'Publications'}
          </span>
        </div>

        {latest_magazine_year && (
          <span className="font-mono text-[11px]">
            Latest: {latest_magazine_year}
          </span>
        )}
      </div>
    </Link>
  );
}
