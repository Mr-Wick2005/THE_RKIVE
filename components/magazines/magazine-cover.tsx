import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { MagazineWithRelations } from '@/types/magazine';
import { BookOpen, Sparkles } from 'lucide-react';

interface MagazineCoverProps {
  magazine: MagazineWithRelations;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  priority?: boolean;
}

export function MagazineCover({
  magazine,
  className,
  size = 'md',
  priority = false,
}: MagazineCoverProps) {
  const { title, subtitle, academic_year, volume, issue, cover_image_url, department } =
    magazine;

  const sizeStyles = {
    sm: 'w-[140px] text-[10px]',
    md: 'w-full max-w-[280px] text-xs',
    lg: 'w-full max-w-[380px] text-sm',
    hero: 'w-full max-w-[420px] text-base',
  }[size];

  // Palette variant based on department name for visual richness on fallback covers
  const getCoverTheme = (deptCode?: string) => {
    switch (deptCode) {
      case 'COMP':
        return {
          bg: 'bg-[#1F2421]',
          text: 'text-[#F8F6F1]',
          accent: 'text-[#B58A55]',
          border: 'border-[#333C37]',
          subtext: 'text-[#9A958E]',
          tagBg: 'bg-[#B58A55]/20 text-[#D8B485]',
        };
      case 'AIML':
        return {
          bg: 'bg-[#1B2228]',
          text: 'text-[#F8F6F1]',
          accent: 'text-[#8EA8C3]',
          border: 'border-[#2C3843]',
          subtext: 'text-[#A0AAB2]',
          tagBg: 'bg-[#8EA8C3]/20 text-[#B8CEE0]',
        };
      case 'EXTC':
        return {
          bg: 'bg-[#26212B]',
          text: 'text-[#F8F6F1]',
          accent: 'text-[#D4A373]',
          border: 'border-[#3F3747]',
          subtext: 'text-[#ADA3B3]',
          tagBg: 'bg-[#D4A373]/20 text-[#E6C29E]',
        };
      case 'IT':
        return {
          bg: 'bg-[#1C2321]',
          text: 'text-[#F8F6F1]',
          accent: 'text-[#A3B18A]',
          border: 'border-[#2D3835]',
          subtext: 'text-[#9CA398]',
          tagBg: 'bg-[#A3B18A]/20 text-[#C4D1AD]',
        };
      case 'MECH':
        return {
          bg: 'bg-[#2B231E]',
          text: 'text-[#F8F6F1]',
          accent: 'text-[#DDA15E]',
          border: 'border-[#42372F]',
          subtext: 'text-[#B8ACA4]',
          tagBg: 'bg-[#DDA15E]/20 text-[#ECC38F]',
        };
      default:
        return {
          bg: 'bg-[#171717]',
          text: 'text-[#F8F6F1]',
          accent: 'text-[#B58A55]',
          border: 'border-[#2E2E2E]',
          subtext: 'text-[#9A958E]',
          tagBg: 'bg-[#B58A55]/20 text-[#D8B485]',
        };
    }
  };

  const theme = getCoverTheme(department?.short_name);

  return (
    <div
      className={cn(
        'relative aspect-magazine rounded-sm overflow-hidden shadow-magazine group/cover transition-all duration-300',
        'border border-[#171717]/10 bg-white select-none',
        sizeStyles,
        className
      )}
    >
      {/* 1. Real Image Cover if available */}
      {cover_image_url ? (
        <div className="relative w-full h-full">
          <Image
            src={cover_image_url}
            alt={`${title} Cover`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover/cover:scale-[1.02]"
          />
          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        </div>
      ) : (
        /* 2. Bespoke Typographic Editorial Cover */
        <div
          className={cn(
            'w-full h-full p-6 flex flex-col justify-between relative overflow-hidden transition-colors',
            theme.bg,
            theme.text
          )}
        >
          {/* Subtle geometric pattern overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Top Editorial Masthead & Department Tag */}
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between border-b border-white/15 pb-2.5">
              <span className="text-[9px] font-mono tracking-widest uppercase opacity-75">
                ATHENAEUM ARCHIVE
              </span>
              <span
                className={cn(
                  'text-[9px] font-mono font-semibold px-2 py-0.5 rounded-sm tracking-wider uppercase',
                  theme.tagBg
                )}
              >
                {department?.short_name || 'ACADEMIC'}
              </span>
            </div>

            <div className="text-[10px] uppercase tracking-widest opacity-60 font-mono">
              {department?.name}
            </div>
          </div>

          {/* Center Title & Subtitle */}
          <div className="relative z-10 my-auto py-4 space-y-2">
            <div className="w-6 h-0.5 bg-[#B58A55] mb-2" />
            <h2 className="font-serif text-xl sm:text-2xl font-normal tracking-tight leading-snug line-clamp-3">
              {title}
            </h2>
            {subtitle && (
              <p
                className={cn(
                  'font-serif text-xs italic font-light line-clamp-2',
                  theme.accent
                )}
              >
                {subtitle}
              </p>
            )}
          </div>

          {/* Bottom Academic Year & Issue Info */}
          <div className="relative z-10 pt-3 border-t border-white/15 flex items-center justify-between text-[10px] font-mono">
            <span className="opacity-75">{academic_year}</span>
            <div className="flex items-center gap-2">
              {volume && <span>{volume}</span>}
              {issue && <span>• {issue}</span>}
            </div>
          </div>
        </div>
      )}

      {/* 3. Physical Book Spine highlight & shadows (Overlay) */}
      <div className="absolute inset-y-0 left-0 w-4 magazine-spine-edge pointer-events-none z-20" />

      {/* 4. Page Edge thickness simulation on the right */}
      <div className="absolute inset-y-0 right-0 w-[1.5px] bg-white/20 pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-black/20 pointer-events-none z-20" />
    </div>
  );
}
