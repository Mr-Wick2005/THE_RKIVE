'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BookOpen,
  Layers,
  ArrowRight,
  Shield,
  Film,
  Menu,
  ExternalLink,
  Laptop,
  Tablet,
  Smartphone,
} from 'lucide-react';
import { LandingPageConfig, CmsStudioData } from '@/types/cms';
import { cn } from '@/lib/utils';

interface InteractivePreviewProps {
  config: LandingPageConfig;
  studioData: CmsStudioData;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  onChangePreviewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
}

export function InteractivePreview({
  config,
  studioData,
  previewMode,
  onChangePreviewMode,
}: InteractivePreviewProps) {
  const { header, hero, archive_reel, recent_releases, departments_showcase, about_section, bookshelf_section, archive_manifesto, footer, theme } = config;

  // Resolve magazines for preview
  const resolvedMagazines = React.useMemo(() => {
    const all = studioData.available_magazines || [];
    if (recent_releases.mode === 'manual' && recent_releases.featured_magazine_ids?.length > 0) {
      const selected = recent_releases.featured_magazine_ids
        .map((id) => all.find((m) => m.id === id))
        .filter(Boolean) as typeof all;
      return selected.slice(0, recent_releases.max_items || 4);
    }
    return all.slice(0, recent_releases.max_items || 4);
  }, [recent_releases, studioData.available_magazines]);

  // Resolve departments for preview
  const resolvedDepartments = React.useMemo(() => {
    const all = studioData.available_departments || [];
    if (departments_showcase.mode === 'manual' && departments_showcase.featured_department_ids?.length > 0) {
      const selected = departments_showcase.featured_department_ids
        .map((id) => all.find((d) => d.id === id))
        .filter(Boolean) as typeof all;
      return selected.slice(0, departments_showcase.max_items || 8);
    }
    return all.slice(0, departments_showcase.max_items || 8);
  }, [departments_showcase, studioData.available_departments]);

  return (
    <div className="flex flex-col h-full bg-[#EAE3D7] border-l-2 border-[#1A1A1A] overflow-hidden">
      {/* Top Preview Bar */}
      <div className="bg-[#FAF8F3] border-b-2 border-[#1A1A1A] p-2.5 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2B6E3F] animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A]">
            Draft Live Preview
          </span>
        </div>

        {/* Viewport switchers */}
        <div className="flex items-center bg-[#F4EFEB] p-0.5 border border-[#1A1A1A]">
          <button
            type="button"
            onClick={() => onChangePreviewMode('desktop')}
            className={cn(
              'p-1 text-xs font-mono font-bold transition-all',
              previewMode === 'desktop' ? 'bg-[#1A1A1A] text-white' : 'text-[#55524D]'
            )}
            title="Desktop View"
          >
            <Laptop className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangePreviewMode('tablet')}
            className={cn(
              'p-1 text-xs font-mono font-bold transition-all',
              previewMode === 'tablet' ? 'bg-[#1A1A1A] text-white' : 'text-[#55524D]'
            )}
            title="Tablet View (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangePreviewMode('mobile')}
            className={cn(
              'p-1 text-xs font-mono font-bold transition-all',
              previewMode === 'mobile' ? 'bg-[#1A1A1A] text-white' : 'text-[#55524D]'
            )}
            title="Mobile View (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rendered Preview Canvas Frame */}
      <div className="flex-1 overflow-y-auto p-4 flex justify-center items-start">
        <div
          className={cn(
            'bg-[#FAF7F2] text-[#1A1A1A] transition-all duration-300 shadow-[8px_8px_0px_#1A1A1A] border-2 border-[#1A1A1A] min-h-[800px]',
            previewMode === 'desktop' && 'w-full max-w-5xl',
            previewMode === 'tablet' && 'w-[768px]',
            previewMode === 'mobile' && 'w-[375px]'
          )}
          style={{
            backgroundColor: theme.surface_background || '#FAF7F2',
          }}
        >
          {/* 1. Header Masthead */}
          <header className="border-b-2 border-[#1A1A1A] bg-[#EAE3D7]/95 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
            <div className="relative h-10 w-36">
              {header.logo_url ? (
                <Image
                  src={header.logo_url}
                  alt={header.logo_alt || 'Logo'}
                  fill
                  className="object-contain object-left"
                />
              ) : (
                <span className="font-serif font-bold text-sm">{header.brand_name}</span>
              )}
            </div>

            <nav className="hidden sm:flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
              {header.nav_links
                ?.filter((l) => l.is_visible !== false)
                .map((link) => (
                  <span key={link.id} className="hover:text-[#1B44B8] cursor-pointer">
                    {link.label}
                  </span>
                ))}
            </nav>

            {header.cta_button?.is_visible && (
              <span className="px-3 py-1.5 border border-[#1A1A1A] bg-[#F4EFEB] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[1px_1px_0px_#1A1A1A]">
                <Shield className="w-3 h-3 text-[#C24A26]" />
                <span>{header.cta_button.label}</span>
              </span>
            )}
          </header>

          {/* 2. Hero Section */}
          {hero.is_visible !== false && (
            <section className="border-b-2 border-[#1A1A1A] p-6 sm:p-10">
              <div
                className={cn(
                  'grid gap-8 items-center',
                  hero.layout_variant === 'split-video' || hero.layout_variant === 'split-artwork'
                    ? 'grid-cols-1 lg:grid-cols-12'
                    : 'grid-cols-1 text-center max-w-3xl mx-auto'
                )}
              >
                {/* Left: Typography */}
                <div
                  className={cn(
                    'space-y-4',
                    hero.layout_variant === 'split-video' || hero.layout_variant === 'split-artwork'
                      ? 'lg:col-span-6 text-left'
                      : 'text-center'
                  )}
                >
                  <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#1A1A1A] leading-[1.08]">
                    <span className="block">{hero.title_line1}</span>
                    <span className="block">{hero.title_line2}</span>
                  </h1>

                  <p className="text-sm sm:text-base text-[#3E3C38] leading-relaxed">
                    {hero.subtitle}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    {hero.primary_cta?.is_visible && (
                      <span
                        className="px-5 py-2.5 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_#1A1A1A] border-2 border-[#1A1A1A]"
                        style={{ backgroundColor: theme.accent_primary || '#1B44B8' }}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{hero.primary_cta.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                    {hero.secondary_cta?.is_visible && (
                      <span className="px-5 py-2.5 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_#1A1A1A]">
                        <Layers className="w-3.5 h-3.5" />
                        <span>{hero.secondary_cta.label}</span>
                      </span>
                    )}
                  </div>

                  {/* Micro Stats */}
                  <div className="pt-4 border-t-2 border-[#1A1A1A] flex items-center gap-6 text-[#1A1A1A]">
                    {hero.stats
                      ?.filter((s) => s.is_visible !== false)
                      .map((stat, idx) => (
                        <div key={stat.id || idx}>
                          <span className="block font-serif text-2xl font-bold">
                            {stat.is_dynamic && stat.dynamic_source === 'departments'
                              ? studioData.available_departments.length
                              : stat.is_dynamic && stat.dynamic_source === 'published_magazines'
                              ? `${studioData.available_magazines.length}+`
                              : stat.value}
                          </span>
                          <span className="text-[10px] uppercase font-mono font-bold tracking-wider block">
                            {stat.label}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Right: Media / Artwork / Reel */}
                {(hero.layout_variant === 'split-video' || hero.layout_variant === 'split-artwork') && (
                  <div className="lg:col-span-6 flex justify-center">
                    {hero.layout_variant === 'split-video' && archive_reel.is_visible !== false ? (
                      <div className="w-full max-w-md bg-[#FAF7F2] border-2 border-[#1A1A1A] p-2.5 shadow-[4px_4px_0px_#1A1A1A]">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#1A1A1A] text-[10px] font-mono">
                          <span className="font-bold flex items-center gap-1 text-[#1B44B8]">
                            <Film className="w-3 h-3" />
                            {archive_reel.badge_title || 'ARCHIVE REEL'}
                          </span>
                          <span className="px-1 py-0.2 bg-[#1A1A1A] text-white text-[9px]">
                            {archive_reel.loop_tag_text || 'LOOP'}
                          </span>
                        </div>
                        <div className="bg-black aspect-video border border-[#1A1A1A] overflow-hidden flex items-center justify-center">
                          <video
                            src={archive_reel.video_url || '/hero-loop-video.mp4'}
                            autoPlay={archive_reel.auto_play}
                            loop={archive_reel.loop}
                            muted
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full max-w-sm border-2 border-[#1A1A1A] bg-[#F4EFEB] p-3 shadow-[4px_4px_0px_#1A1A1A]">
                        <div className="relative aspect-square border-2 border-[#1A1A1A] overflow-hidden bg-[#EAE3D7]">
                          <Image
                            src={hero.custom_artwork_url || '/images/rkive-painting.png'}
                            alt="Artwork"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 3. Recent Releases */}
          {recent_releases.is_visible !== false && (
            <section className="p-6 sm:p-10 border-b-2 border-[#1A1A1A]">
              <div className="mb-6">
                <span className="text-xs font-mono font-bold uppercase text-[#C24A26] block">
                  {recent_releases.eyebrow}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
                  {recent_releases.title}
                </h2>
                <p className="text-xs text-[#55524D] mt-1">{recent_releases.subtitle}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {resolvedMagazines.map((mag) => (
                  <div
                    key={mag.id}
                    className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-2.5 shadow-[3px_3px_0px_#1A1A1A] flex flex-col justify-between"
                  >
                    <div className="relative aspect-3/4 border border-[#1A1A1A] bg-[#EAE3D7] mb-2 overflow-hidden">
                      {mag.cover_image_url ? (
                        <Image
                          src={mag.cover_image_url}
                          alt={mag.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-[10px] font-mono">
                          No Cover
                        </div>
                      )}
                    </div>
                    <div>
                      {recent_releases.show_department_badge && mag.department_name && (
                        <span className="text-[9px] font-mono font-bold uppercase text-[#1B44B8] block truncate">
                          {mag.department_name}
                        </span>
                      )}
                      <div className="font-bold text-xs text-[#1A1A1A] truncate">
                        {mag.title}
                      </div>
                      {recent_releases.show_academic_year && (
                        <div className="text-[10px] font-mono text-[#77736C]">
                          {mag.academic_year}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. Departments Showcase */}
          {departments_showcase.is_visible !== false && (
            <section className="p-6 sm:p-10 border-b-2 border-[#1A1A1A]">
              <div className="mb-6">
                <span className="text-xs font-mono font-bold uppercase text-[#C24A26] block">
                  {departments_showcase.eyebrow}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
                  {departments_showcase.title}
                </h2>
                <p className="text-xs text-[#55524D] mt-1">{departments_showcase.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {resolvedDepartments.map((dept) => {
                  const override = (departments_showcase.department_overrides || {})[dept.id] || {};
                  return (
                    <div
                      key={dept.id}
                      className="p-3.5 border-2 border-[#1A1A1A] bg-[#F4EFEB] shadow-[2px_2px_0px_#1A1A1A]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] font-bold uppercase text-[#1B44B8]">
                          {dept.short_name}
                        </span>
                        <span className="text-[10px] font-mono text-[#77736C]">
                          {dept.magazine_count || 0} Editions
                        </span>
                      </div>
                      <div className="font-serif font-bold text-sm text-[#1A1A1A]">
                        {override.display_label || dept.name}
                      </div>
                      <p className="text-[11px] text-[#55524D] mt-1 line-clamp-2 leading-relaxed">
                        {override.custom_description || dept.description || 'Academic department.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 5. About Section */}
          {about_section.is_visible !== false && (
            <section className="p-6 sm:p-10 border-b-2 border-[#1A1A1A]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <span className="text-xs font-mono font-bold uppercase text-[#C24A26] block">
                    {about_section.eyebrow}
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
                    {about_section.title}
                  </h2>
                  <div className="space-y-2 text-xs sm:text-sm text-[#3E3C38] leading-relaxed">
                    {about_section.body_paragraphs?.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                  {about_section.cta?.is_visible && (
                    <div className="pt-2">
                      <span className="px-4 py-2 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-[2px_2px_0px_#1B44B8]">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{about_section.cta.label}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 flex justify-center">
                  <div className="relative w-full max-w-xs aspect-square border-2 border-[#1A1A1A] bg-[#F4EFEB] p-2 shadow-[4px_4px_0px_#1A1A1A]">
                    <div className="relative w-full h-full border border-[#1A1A1A] overflow-hidden bg-[#EAE3D7]">
                      <Image
                        src={about_section.image_url || '/images/rkive-painting.png'}
                        alt={about_section.image_alt || 'Artwork'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 6. Footer */}
          <footer className="bg-[#DDD4C5]/50 p-6 sm:p-10 border-t-2 border-[#1A1A1A]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
              <div className="md:col-span-2 space-y-2">
                <div className="relative h-8 w-32">
                  {footer.logo_url ? (
                    <Image
                      src={footer.logo_url}
                      alt="Footer Logo"
                      fill
                      className="object-contain object-left"
                    />
                  ) : (
                    <span className="font-serif font-bold text-sm">THE RKIVE</span>
                  )}
                </div>
                <p className="text-[11px] text-[#55524D] leading-relaxed max-w-sm">
                  {footer.brand_description}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="font-mono text-xs font-bold uppercase text-[#1A1A1A] block">
                  Navigation
                </span>
                {footer.quick_links?.map((l) => (
                  <div key={l.id} className="text-[#3E3C38]">
                    {l.label}
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <span className="font-mono text-xs font-bold uppercase text-[#1A1A1A] block">
                  Faculties
                </span>
                {footer.faculty_links?.map((l) => (
                  <div key={l.id} className="text-[#3E3C38]">
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-[#1A1A1A]/20 flex flex-col sm:flex-row items-center justify-between text-[10px] text-[#77736C]">
              <span>© {new Date().getFullYear()} {footer.copyright_text}</span>
              <span>
                Developed by {footer.credits_developer_1}, {footer.credits_developer_2}
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
