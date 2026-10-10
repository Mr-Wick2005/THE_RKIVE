import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Layers, ArrowRight } from 'lucide-react';
import { HeroVideoLoop } from './hero-video-loop';
import { Magazine } from '@/types/magazine';
import { HeroConfig, ArchiveReelConfig, ThemeConfig } from '@/types/cms';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  departmentsCount: number;
  publishedCount: number;
  magazines?: Magazine[];
  config?: HeroConfig;
  reelConfig?: ArchiveReelConfig;
  themeConfig?: ThemeConfig;
}

export function HeroSection({
  departmentsCount,
  publishedCount,
  config,
  reelConfig,
  themeConfig,
}: HeroSectionProps) {
  if (config?.is_visible === false) return null;

  const titleLine1 = config?.title_line1 || 'Welcome to';
  const titleLine2 = config?.title_line2 || 'THE RKIVE';
  const subtitle =
    config?.subtitle ||
    'Explore the digital magazines, engineering periodicals, capstone proceedings, and creative scholarship produced across our college academic community.';

  const primaryCta = config?.primary_cta || {
    label: 'Explore Magazines',
    href: '/magazines',
    is_visible: true,
  };

  const secondaryCta = config?.secondary_cta || {
    label: 'Browse Departments',
    href: '#departments',
    is_visible: true,
  };

  const stats = config?.stats || [
    { id: '1', value: String(departmentsCount), label: 'Academic Faculties', is_visible: true, is_dynamic: true, dynamic_source: 'departments' },
    { id: '2', value: `${publishedCount}+`, label: 'Published Editions', is_visible: true, is_dynamic: true, dynamic_source: 'published_magazines' },
    { id: '3', value: '100%', label: 'Peer Governed', is_visible: true },
  ];

  const layoutVariant = config?.layout_variant || 'split-video';
  const isSplit = layoutVariant === 'split-video' || layoutVariant === 'split-artwork';

  return (
    <section className="border-b-2 border-[#1A1A1A] bg-transparent pt-12 pb-20 px-6 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div
          className={cn(
            'grid gap-12 items-center',
            isSplit ? 'grid-cols-1 lg:grid-cols-12 lg:gap-10' : 'grid-cols-1 max-w-4xl mx-auto text-center'
          )}
        >
          {/* Left Column: Typography & CTAs */}
          <div className={cn('space-y-6', isSplit ? 'lg:col-span-6 text-left' : 'text-center')}>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-[#1A1A1A] leading-[1.08]">
              <span className="block">{titleLine1}</span>
              <span className="block">{titleLine2}</span>
            </h1>

            <p className={cn('text-lg sm:text-xl text-[#3E3C38] font-normal leading-relaxed', isSplit ? 'max-w-xl' : 'max-w-2xl mx-auto')}>
              {subtitle}
            </p>

            <div className={cn('pt-2 flex flex-row flex-wrap items-center gap-4', !isSplit && 'justify-center')}>
              {primaryCta.is_visible !== false && (
                <Link
                  href={primaryCta.href || '/magazines'}
                  className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 bg-[#1A1A1A] text-[#FAF7F2] text-sm sm:text-base font-bold uppercase tracking-wider hover:bg-[#1B44B8] border-2 border-[#1A1A1A] hover:border-[#1B44B8] shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[5px_5px_0px_#1B44B8] transition-all group whitespace-nowrap"
                  style={{
                    backgroundColor: themeConfig?.accent_primary || '#1A1A1A',
                  }}
                >
                  <BookOpen className="w-5 h-5 text-[#FAF7F2]" />
                  <span>{primaryCta.label}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              )}
              {secondaryCta.is_visible !== false && (
                <a
                  href={secondaryCta.href || '#departments'}
                  className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-[#1A1A1A] text-sm sm:text-base font-bold uppercase tracking-wider hover:bg-[#FAF7F2] shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[5px_5px_0px_#C24A26] transition-all whitespace-nowrap"
                >
                  <Layers className="w-5 h-5 text-[#1A1A1A]" />
                  <span>{secondaryCta.label}</span>
                </a>
              )}
            </div>

            {/* Micro Stat Badges */}
            <div className={cn('pt-8 border-t-2 border-[#1A1A1A] flex items-center gap-8 sm:gap-12 text-[#1A1A1A]', !isSplit && 'justify-center')}>
              {stats
                .filter((s) => s.is_visible !== false)
                .map((stat, idx, arr) => (
                  <React.Fragment key={stat.id || idx}>
                    <div>
                      <span className="block font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A]">
                        {stat.is_dynamic && stat.dynamic_source === 'departments'
                          ? departmentsCount
                          : stat.is_dynamic && stat.dynamic_source === 'published_magazines'
                          ? `${publishedCount}+`
                          : stat.value}
                      </span>
                      <span className="text-xs sm:text-sm uppercase font-mono font-bold tracking-wider text-[#1A1A1A] mt-1 block">
                        {stat.label}
                      </span>
                    </div>
                    {idx < arr.length - 1 && <div className="h-10 w-0.5 bg-[#1A1A1A]" />}
                  </React.Fragment>
                ))}
            </div>
          </div>

          {/* Right Column: Media Reel / Framed Artwork */}
          {isSplit && (
            <div className="lg:col-span-6 flex justify-center items-center w-full">
              {layoutVariant === 'split-video' ? (
                <HeroVideoLoop config={reelConfig} />
              ) : (
                <div className="relative w-full max-w-lg cutout-card cutout-card-tape p-3 sm:p-4 bg-[#F4EFEB] border-2 border-[#1A1A1A] shadow-[6px_6px_0px_#1A1A1A]">
                  <div className="relative aspect-square w-full border-2 border-[#1A1A1A] overflow-hidden bg-[#EAE3D7]">
                    <Image
                      src={config?.custom_artwork_url || '/images/rkive-painting.png'}
                      alt={config?.custom_artwork_alt || 'Editorial Artwork'}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
