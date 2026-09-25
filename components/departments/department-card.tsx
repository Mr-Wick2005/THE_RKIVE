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
      className="group flex flex-col justify-between p-6 sm:p-8 cutout-card cutout-card-tape hover-lift-orange relative overflow-visible"
    >
      {/* Top Code Badge & Arrow */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-mono font-bold px-3.5 py-1.5 bg-[#EAE3D7] text-[#1A1A1A] border-2 border-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-[#FAF7F2] transition-colors">
            {short_name}
          </span>
          <div className="w-9 h-9 bg-[#EAE3D7] text-[#1A1A1A] border border-[#1A1A1A]/30 flex items-center justify-center group-hover:bg-[#C24A26] group-hover:text-[#FAF7F2] group-hover:border-[#C24A26] transition-all">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] group-hover:text-[#C24A26] transition-colors leading-snug">
          {name}
        </h3>

        <p className="text-base sm:text-lg text-[#3E3C38] mt-3.5 line-clamp-3 leading-relaxed font-normal">
          {description ||
            'Departmental capstone periodicals, peer-reviewed engineering proceedings, and annual research digests.'}
        </p>
      </div>

      {/* Bottom Publication Stats */}
      <div className="pt-5 mt-6 border-t border-[#1A1A1A]/15 flex items-center justify-between text-sm sm:text-base text-[#1A1A1A]">
        <div className="flex items-center gap-2 font-medium">
          <BookOpen className="w-4 h-4 text-[#C24A26]" />
          <span className="font-bold text-[#1A1A1A]">
            {magazine_count} {magazine_count === 1 ? 'Publication' : 'Publications'}
          </span>
        </div>

        {latest_magazine_year && (
          <span className="font-mono text-xs sm:text-sm font-bold text-[#1A1A1A] bg-[#EAE3D7] px-3 py-1.5 border border-[#1A1A1A]/20">
            Latest: {latest_magazine_year}
          </span>
        )}
      </div>
    </Link>
  );
}
