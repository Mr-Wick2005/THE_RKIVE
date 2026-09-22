'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MagazineCover } from './magazine-cover';
import { MagazineWithRelations } from '@/types/magazine';

interface HeroCompositionProps {
  magazines: MagazineWithRelations[];
}

export function HeroComposition({ magazines }: HeroCompositionProps) {
  // Take up to 4 magazines for the layered hero composition
  const displayMagazines = magazines.slice(0, 4);

  // Artistic rotation and z-index offsets for layered depth
  const coverConfigs = [
    {
      rotate: -7,
      x: -40,
      y: 10,
      scale: 0.92,
      zIndex: 10,
      opacity: 0.85,
    },
    {
      rotate: 4,
      x: 35,
      y: -15,
      scale: 0.95,
      zIndex: 20,
      opacity: 0.95,
    },
    {
      rotate: -1,
      x: 0,
      y: 0,
      scale: 1.05,
      zIndex: 30,
      opacity: 1,
    },
    {
      rotate: 8,
      x: 80,
      y: 25,
      scale: 0.88,
      zIndex: 15,
      opacity: 0.8,
    },
  ];

  return (
    <div className="relative w-full max-w-2xl mx-auto h-[460px] sm:h-[520px] flex items-center justify-center perspective-[1200px] select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-gradient-radial from-[#E8E2D8]/70 via-[#F0EBE1]/40 to-transparent blur-2xl -z-10" />

      {displayMagazines.map((magazine, index) => {
        const config = coverConfigs[index % coverConfigs.length];
        const isMain = index === 2 || (displayMagazines.length < 3 && index === 0);

        return (
          <motion.div
            key={magazine.id}
            initial={{ opacity: 0, scale: 0.8, y: 30, rotate: 0 }}
            animate={{
              opacity: config.opacity,
              scale: config.scale,
              x: config.x,
              y: config.y,
              rotate: config.rotate,
            }}
            whileHover={{
              scale: 1.08,
              y: -15,
              rotate: 0,
              zIndex: 50,
              opacity: 1,
              transition: { duration: 0.25, ease: 'easeOut' },
            }}
            transition={{ duration: 0.7, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={{ zIndex: config.zIndex }}
            className="absolute cursor-pointer"
          >
            <Link href={`/magazine/${magazine.slug}`} className="block">
              <div className="relative shadow-2xl hover:shadow-magazine-hover transition-shadow duration-300">
                <MagazineCover
                  magazine={magazine}
                  size="hero"
                  className="w-[200px] sm:w-[260px] lg:w-[290px]"
                  priority={isMain}
                />
              </div>

              {isMain && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#171717] text-[#F8F6F1] px-3 py-1 rounded-sm text-[10px] font-mono tracking-widest uppercase shadow-md whitespace-nowrap">
                  Featured Publication
                </div>
              )}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
