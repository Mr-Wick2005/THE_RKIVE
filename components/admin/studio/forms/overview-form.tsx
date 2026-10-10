'use client';

import React from 'react';
import {
  Sparkles,
  Send,
  Save,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  History,
  Layers,
  FileText,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { LandingPageConfig, CmsStudioData } from '@/types/cms';

interface OverviewFormProps {
  config: LandingPageConfig;
  studioData: CmsStudioData;
  isDirty: boolean;
  onSaveDraft: () => void;
  onOpenPublishModal: () => void;
  onSelectSection: (section: any) => void;
}

export function OverviewForm({
  config,
  studioData,
  isDirty,
  onSaveDraft,
  onOpenPublishModal,
  onSelectSection,
}: OverviewFormProps) {
  const visibleSectionsCount = config.section_order.filter(
    key => (config[key as keyof LandingPageConfig] as any)?.is_visible !== false
  ).length;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Overview Banner Card */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 sm:p-8 shadow-[4px_4px_0px_#1A1A1A] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
              College Super Admin Landing Page Studio
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] tracking-tight">
              Homepage Content Architecture
            </h2>
            <p className="text-sm sm:text-base text-[#3E3C38] max-w-xl leading-relaxed">
              Manage the public-facing identity, masthead, hero typography, continuous video reel, curated magazine releases, department showcases, and footer links in one integrated studio.
            </p>
          </div>

          <div className="flex flex-col gap-3 min-w-[200px]">
            <button
              type="button"
              onClick={onOpenPublishModal}
              className="w-full px-5 py-3 border-2 border-[#1A1A1A] bg-[#1B44B8] text-[#FAF7F2] text-xs sm:text-sm font-bold uppercase tracking-wider hover:bg-[#133596] transition-all flex items-center justify-center gap-2 shadow-[3px_3px_0px_#1A1A1A] cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Publish to Live</span>
            </button>

            <button
              type="button"
              onClick={onSaveDraft}
              className="w-full px-5 py-2.5 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider hover:bg-[#FAF8F3] transition-all flex items-center justify-center gap-2 shadow-[2px_2px_0px_#1A1A1A] cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#1B44B8]" />
              <span>Save Draft</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="border-2 border-[#1A1A1A] bg-[#F4EFEB] p-5 shadow-[3px_3px_0px_#1A1A1A]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1A1A1A]/20">
            <span className="text-xs font-mono font-bold uppercase text-[#55524D]">
              Live Version
            </span>
            <span className="text-xs font-mono font-bold bg-[#1B44B8] text-[#FAF7F2] px-2 py-0.5 border border-[#1A1A1A]">
              v{studioData.version}
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-[#1A1A1A]">
              {studioData.published_at
                ? new Date(studioData.published_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Default System Baseline'}
            </div>
            <p className="text-xs text-[#77736C]">
              By {studioData.published_by_name || 'System Initializer'}
            </p>
          </div>
        </div>

        <div className="border-2 border-[#1A1A1A] bg-[#F4EFEB] p-5 shadow-[3px_3px_0px_#1A1A1A]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1A1A1A]/20">
            <span className="text-xs font-mono font-bold uppercase text-[#55524D]">
              Draft Status
            </span>
            {isDirty ? (
              <span className="text-xs font-mono font-bold text-[#C24A26] bg-[#C24A26]/10 px-2 py-0.5 border border-[#C24A26]/30">
                Unsaved
              </span>
            ) : (
              <span className="text-xs font-mono font-bold text-[#2B6E3F] bg-[#2B6E3F]/10 px-2 py-0.5 border border-[#2B6E3F]/30">
                Synced
              </span>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-[#1A1A1A]">
              {isDirty ? 'Pending Draft Changes' : 'Ready for Publishing'}
            </div>
            <p className="text-xs text-[#77736C]">
              {studioData.draft_updated_at
                ? `Last modified ${new Date(studioData.draft_updated_at).toLocaleTimeString()}`
                : 'All changes in sync'}
            </p>
          </div>
        </div>

        <div className="border-2 border-[#1A1A1A] bg-[#F4EFEB] p-5 shadow-[3px_3px_0px_#1A1A1A]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1A1A1A]/20">
            <span className="text-xs font-mono font-bold uppercase text-[#55524D]">
              Layout Health
            </span>
            <span className="text-xs font-mono font-bold bg-[#1A1A1A] text-[#FAF7F2] px-2 py-0.5">
              {visibleSectionsCount} / {config.section_order.length} Active
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-bold text-[#1A1A1A]">
              {studioData.available_magazines.length} Published Magazines
            </div>
            <p className="text-xs text-[#77736C]">
              {studioData.available_departments.length} Academic Faculties Available
            </p>
          </div>
        </div>
      </div>

      {/* Quick Access Section Directory */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
          Quick Section Navigation
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { id: 'header', title: 'Header & Navigation', desc: 'Logo, nav links, editorial desk CTA' },
            { id: 'hero', title: 'Hero Section', desc: 'Main heading, typography, CTAs, stats' },
            { id: 'archive_reel', title: 'Archive Reel', desc: 'Continuous video loop & controls' },
            { id: 'recent_releases', title: 'Recent Releases', desc: 'Curated magazine showcase' },
            { id: 'departments_showcase', title: 'Department Showcase', desc: 'Academic faculties directory' },
            { id: 'about_section', title: 'About THE RKIVE', desc: 'Mission statement & artwork' },
            { id: 'theme', title: 'Theme & Appearance', desc: 'Color palette, fonts, spacing' },
            { id: 'media_library', title: 'Media Library', desc: 'Image & video asset manager' },
            { id: 'version_history', title: 'Version History', desc: 'Audit trail & 1-click rollback' },
          ].map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => onSelectSection(sec.id)}
              className="p-3.5 border-2 border-[#1A1A1A]/30 bg-[#F4EFEB] hover:border-[#1A1A1A] hover:bg-[#FAF8F3] hover:shadow-[2px_2px_0px_#1A1A1A] text-left transition-all group cursor-pointer"
            >
              <div className="font-bold text-xs text-[#1A1A1A] group-hover:text-[#1B44B8] transition-colors">
                {sec.title} →
              </div>
              <div className="text-[11px] text-[#77736C] mt-1 leading-snug">
                {sec.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
