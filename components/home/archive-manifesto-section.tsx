import React from 'react';
import { Library, ShieldCheck, BookmarkCheck, BookOpen } from 'lucide-react';
import { ArchiveManifestoConfig } from '@/types/cms';

interface ArchiveManifestoSectionProps {
  config?: ArchiveManifestoConfig;
}

export function ArchiveManifestoSection({ config }: ArchiveManifestoSectionProps) {
  if (config?.is_visible === false) return null;

  const eyebrow = config?.eyebrow || 'Editorial Governance & Archival Mission';
  const title = config?.title || 'Preserving Collegiate Scholarship & Departmental Legacy';
  const description =
    config?.description ||
    'THE RKIVE serves as the permanent digital repository for our college institution. Every edition is authenticated by faculty editorial advisors, securely indexed with PostgreSQL Row Level Security, and made freely accessible for global academic inquiry.';

  const badges = config?.badges || [
    { id: '1', icon: 'ShieldCheck', text: 'Faculty Reviewed' },
    { id: '2', icon: 'BookmarkCheck', text: 'Permanent Digital Records' },
    { id: '3', icon: 'BookOpen', text: 'Open Academic Access' },
  ];

  return (
    <section id="about" className="border-t border-ink/15 bg-transparent py-16 sm:py-20 px-6 sm:px-10">
      <div className="max-w-5xl mx-auto text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-white/60 border border-[#E8E2D8] flex items-center justify-center mx-auto text-[#B58A55] shadow-xs">
          <Library className="w-6 h-6" />
        </div>

        <span className="text-[11px] font-mono uppercase tracking-widest text-[#B58A55] block">
          {eyebrow}
        </span>

        <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#171717] max-w-3xl mx-auto">
          {title}
        </h2>

        <p className="text-xs sm:text-sm text-[#77736C] max-w-2xl mx-auto leading-relaxed font-light">
          {description}
        </p>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[#171717]">
          {badges.map((b) => (
            <div key={b.id} className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span className="font-medium">{b.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
