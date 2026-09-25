'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MagazineCover } from './magazine-cover';
import { MagazineWithRelations } from '@/types/magazine';
import { ArrowUpRight, FileText } from 'lucide-react';

interface MagazineCardProps {
  magazine: MagazineWithRelations;
}

export function MagazineCard({ magazine }: MagazineCardProps) {
  const { slug, title, subtitle, academic_year, edition, page_count, department } =
    magazine;

  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col justify-between cutout-card cutout-card-tape hover-lift-blue p-3.5 sm:p-4 bg-[#F4EFEB]"
    >
      <Link href={`/magazine/${slug}`} className="flex flex-col h-full justify-between">
        {/* Physical Magazine Cover Presentation */}
        <div className="relative mb-3.5 p-2.5 sm:p-3 bg-[#EAE3D7] border border-[#1A1A1A]/30 transition-all duration-300 group-hover:border-[#1A1A1A] overflow-hidden">
          <div className="relative mx-auto flex justify-center perspective-[1000px] overflow-hidden">
            <div className="w-full max-w-[260px] flex justify-center transition-transform duration-700 ease-out group-hover:scale-105">
              <MagazineCover magazine={magazine} size="md" />
            </div>
          </div>

          {/* Quick Peek Action Overlay Indicator */}
          <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <div className="w-7 h-7 bg-[#1A1A1A] text-[#FAF7F2] flex items-center justify-center border border-[#FAF7F2]/20 shadow-md">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Editorial Metadata Block */}
        <div className="space-y-2 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#C24A26] truncate max-w-[65%]">
                {department?.name || 'Departmental Review'}
              </span>
              <span className="text-xs font-mono font-bold text-[#1A1A1A] bg-[#EAE3D7] px-2 py-0.5 border border-[#1A1A1A]/20 flex-shrink-0">
                {academic_year}
              </span>
            </div>

            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1A1A1A] leading-snug group-hover:text-[#1B44B8] transition-colors line-clamp-1">
              {title}
            </h3>

            {subtitle && (
              <p className="text-sm text-[#555048] font-medium mt-1 line-clamp-1 italic">
                &ldquo;{subtitle}&rdquo;
              </p>
            )}
          </div>

          <div className="pt-2.5 mt-2.5 border-t border-[#1A1A1A]/15 flex items-center justify-between text-xs sm:text-sm text-[#1A1A1A]">
            <span className="flex items-center gap-1.5 font-mono font-semibold">
              <FileText className="w-3.5 h-3.5 text-[#C24A26]" />
              <span>{page_count} Pages</span>
            </span>
            <span className="font-mono text-xs font-bold uppercase text-[#1A1A1A] bg-[#EAE3D7] px-2 py-0.5 border border-[#1A1A1A]/20">
              {edition || 'Annual Issue'}
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

