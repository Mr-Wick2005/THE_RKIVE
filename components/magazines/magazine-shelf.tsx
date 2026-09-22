'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MagazineCover } from './magazine-cover';
import { MagazineWithRelations } from '@/types/magazine';
import { ChevronLeft, ChevronRight, BookMarked, Sparkles } from 'lucide-react';

interface MagazineShelfProps {
  magazines: MagazineWithRelations[];
}

export function MagazineShelf({ magazines }: MagazineShelfProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative py-8">
      {/* Shelf Header Controls */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-[#B58A55]" />
          <span className="text-xs uppercase tracking-widest font-mono text-[#77736C]">
            Interactive Archival Shelf • {magazines.length} Editions Available
          </span>
        </div>

        {/* Scroll Arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll shelf left"
            className="w-8 h-8 rounded-sm border border-[#E8E2D8] bg-white flex items-center justify-center text-[#171717] hover:bg-[#171717] hover:text-[#F8F6F1] transition-all shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label="Scroll shelf right"
            className="w-8 h-8 rounded-sm border border-[#E8E2D8] bg-white flex items-center justify-center text-[#171717] hover:bg-[#171717] hover:text-[#F8F6F1] transition-all shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bookshelf Stage Container */}
      <div className="relative">
        {/* Horizontal Magazines Flow with 3D Depth */}
        <div
          ref={scrollContainerRef}
          className="flex items-end gap-8 sm:gap-12 overflow-x-auto pb-6 pt-10 px-6 sm:px-12 no-scrollbar scroll-smooth perspective-[1200px]"
        >
          {magazines.map((magazine, index) => (
            <motion.div
              key={magazine.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="flex-shrink-0 group/book"
            >
              <Link href={`/magazine/${magazine.slug}`} className="block">
                <motion.div
                  whileHover={{
                    y: -20,
                    scale: 1.04,
                    rotateZ: -1,
                    rotateY: 5,
                    transition: { duration: 0.25, ease: 'easeOut' },
                  }}
                  className="relative transition-all duration-300 transform-gpu cursor-pointer"
                >
                  {/* Spine highlight on shelf */}
                  <div className="relative shadow-magazine-hover group-hover/book:shadow-2xl">
                    <MagazineCover
                      magazine={magazine}
                      size="md"
                      className="w-[200px] sm:w-[240px]"
                    />
                  </div>

                  {/* Title tooltip on hover */}
                  <div className="mt-3 text-center opacity-0 group-hover/book:opacity-100 transition-opacity duration-200">
                    <span className="inline-block text-[11px] font-mono text-[#171717] bg-white border border-[#E8E2D8] px-2 py-0.5 rounded-sm shadow-sm">
                      {magazine.department?.short_name} • {magazine.academic_year}
                    </span>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Physical Wooden/Warm-Beige Shelf Platform */}
        <div className="relative w-full">
          {/* Top Surface of the shelf */}
          <div className="h-3 bg-gradient-to-r from-[#E0D7C8] via-[#E8E2D8] to-[#E0D7C8] border-t border-[#D0C7B7] shadow-sm rounded-t-sm" />
          {/* Front Face / Thickness of the shelf */}
          <div className="h-4 bg-gradient-to-b from-[#D6CDC0] to-[#C8BFA8] border-b border-[#B8AE95] shadow-shelf" />
        </div>
      </div>
    </div>
  );
}
