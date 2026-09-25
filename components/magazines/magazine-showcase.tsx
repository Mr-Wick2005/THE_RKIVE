import React from 'react';
import Link from 'next/link';
import { MagazineWithRelations } from '@/types/magazine';
import { MagazineCover } from './magazine-cover';
import { ShareButton } from './share-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { BookOpen, ShieldCheck } from 'lucide-react';

interface MagazineShowcaseProps {
  magazine: MagazineWithRelations;
}

export function MagazineShowcase({ magazine }: MagazineShowcaseProps) {
  return (
    <article className="cutout-card cutout-card-tape p-8 sm:p-12 lg:p-16 mb-16 shadow-[8px_8px_0px_#1A1A1A] hover:shadow-[12px_12px_0px_#1B44B8] border-2 border-[#1A1A1A] transition-all">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Column: Dominant Physical Magazine Cover */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative group/showcase perspective-[1200px] w-full max-w-[340px] sm:max-w-[380px]">
            <div className="shadow-[8px_8px_0px_#1A1A1A] hover:shadow-[12px_12px_0px_#C24A26] transition-all duration-300">
              <MagazineCover
                magazine={magazine}
                size="hero"
                className="w-full"
                priority
              />
            </div>

            {/* Subtle paper reflection line */}
            <div className="mt-4 text-center">
              <span className="text-xs font-mono uppercase tracking-widest text-[#1A1A1A] font-bold">
                Volume Edition • {magazine.academic_year}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Title, Synopsis, Metadata, and CTAs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Department & Status Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/department/${magazine.department?.slug}`}>
              <Badge variant="department">
                {magazine.department?.name || 'Departmental Journal'}
              </Badge>
            </Link>
            <Badge variant="outline" className="font-mono">
              {magazine.academic_year}
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-[#1B44B8] bg-[#1B44B8]/10 px-3 py-1 border border-[#1B44B8]/30 font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#1B44B8]" />
              <span>Peer-Reviewed Publication</span>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1A1A1A] leading-tight">
              {magazine.title}
            </h1>
            {magazine.subtitle && (
              <p className="font-serif text-lg sm:text-xl text-[#C24A26] italic font-medium">
                {magazine.subtitle}
              </p>
            )}
          </div>

          {/* Synopsis / Abstract */}
          <div className="space-y-2.5 pt-4 border-t border-[#1A1A1A]/15">
            <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-[#1A1A1A]">
              Editorial Synopsis & Abstract
            </h3>
            <p className="text-base sm:text-lg text-[#3E3C38] leading-relaxed font-normal">
              {magazine.description ||
                'This digital magazine features faculty capstone research, student editorial essays, departmental achievements, and technical project showcases.'}
            </p>
          </div>

          {/* Detailed Publication Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-[#EAE3D7] border-2 border-[#1A1A1A] text-sm font-mono shadow-[3px_3px_0px_#1A1A1A]">
            <div>
              <span className="block text-xs text-[#706B62] font-bold uppercase">Edition</span>
              <span className="font-bold text-base text-[#1A1A1A] mt-1 block">
                {magazine.edition || 'Annual Issue'}
              </span>
            </div>
            <div>
              <span className="block text-xs text-[#706B62] font-bold uppercase">Volume</span>
              <span className="font-bold text-base text-[#1A1A1A] mt-1 block">
                {magazine.volume || 'Vol. 1'}
              </span>
            </div>
            <div>
              <span className="block text-xs text-[#706B62] font-bold uppercase">Length</span>
              <span className="font-bold text-base text-[#1A1A1A] mt-1 block">
                {magazine.page_count} Pages
              </span>
            </div>
            <div>
              <span className="block text-xs text-[#706B62] font-bold uppercase">Published</span>
              <span className="font-bold text-base text-[#1A1A1A] mt-1 block">
                {formatDate(magazine.published_at)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link href={`/reader/${magazine.slug}`} className="flex-1 sm:flex-initial">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto gap-2.5 bg-[#1A1A1A] text-[#FAF7F2] hover:bg-[#1B44B8] border-2 border-[#1A1A1A] hover:border-[#1B44B8] shadow-[4px_4px_0px_#1A1A1A] hover:shadow-[6px_6px_0px_#1B44B8] font-semibold text-sm sm:text-base uppercase tracking-wider px-8 py-4 transition-all"
              >
                <BookOpen className="w-5 h-5 text-[#FAF7F2]" />
                <span>Read Magazine</span>
              </Button>
            </Link>

            <ShareButton title={magazine.title} />
          </div>
        </div>
      </div>
    </article>
  );
}
