'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MagazineCover } from './magazine-cover';
import { MagazineWithRelations } from '@/types/magazine';
import { ArrowUpRight, BookOpen, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
      className="group relative flex flex-col justify-between"
    >
      <Link href={`/magazine/${slug}`} className="block">
        {/* Physical Magazine Cover Presentation with Hover Physics */}
        <div className="relative mb-5 p-4 sm:p-5 rounded-sm bg-[#F0EBE1]/60 border border-[#E8E2D8] transition-all duration-300 group-hover:bg-[#E8E2D8]/80 group-hover:border-[#DCD5C9] group-hover:shadow-editorial-lg">
          <div className="relative mx-auto flex justify-center perspective-[1000px]">
            <motion.div
              whileHover={{
                y: -8,
                rotateY: -3,
                rotateX: 2,
                transition: { duration: 0.25, ease: 'easeOut' },
              }}
              className="w-full flex justify-center"
            >
              <MagazineCover magazine={magazine} size="md" />
            </motion.div>
          </div>

          {/* Quick Peek Action Overlay Indicator */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-7 h-7 rounded-full bg-[#171717] text-[#F8F6F1] flex items-center justify-center shadow-md">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Editorial Metadata Block */}
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#B58A55]">
              {department?.name || 'Departmental Review'}
            </span>
            <span className="text-[11px] font-mono text-[#77736C]">
              {academic_year}
            </span>
          </div>

          <h3 className="font-serif text-lg sm:text-xl font-medium text-[#171717] leading-snug group-hover:text-[#B58A55] transition-colors line-clamp-2">
            {title}
          </h3>

          {subtitle && (
            <p className="text-xs text-[#77736C] font-light line-clamp-1 italic">
              {subtitle}
            </p>
          )}

          <div className="editorial-rule my-3 opacity-60" />

          <div className="flex items-center justify-between text-[11px] text-[#77736C]">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{page_count} Pages</span>
            </span>
            <span className="font-mono text-[#44423E]">
              {edition || 'Annual Issue'}
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
