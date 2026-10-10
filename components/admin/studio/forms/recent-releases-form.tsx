'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  BookOpen,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  Sparkles,
  Check,
  Search,
} from 'lucide-react';
import { RecentReleasesConfig, CmsStudioData } from '@/types/cms';
import { cn } from '@/lib/utils';

interface RecentReleasesFormProps {
  releases: RecentReleasesConfig;
  onChange: (updated: RecentReleasesConfig) => void;
  studioData: CmsStudioData;
}

export function RecentReleasesForm({
  releases,
  onChange,
  studioData,
}: RecentReleasesFormProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const updateField = <K extends keyof RecentReleasesConfig>(
    key: K,
    value: RecentReleasesConfig[K]
  ) => {
    onChange({ ...releases, [key]: value });
  };

  const toggleFeaturedMagazine = (id: string) => {
    const current = releases.featured_magazine_ids || [];
    if (current.includes(id)) {
      updateField('featured_magazine_ids', current.filter((mId) => mId !== id));
    } else {
      updateField('featured_magazine_ids', [...current, id]);
    }
  };

  const moveMagazineOrder = (index: number, direction: 'up' | 'down') => {
    const current = [...(releases.featured_magazine_ids || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIdx];
    current[targetIdx] = temp;
    updateField('featured_magazine_ids', current);
  };

  const availableMags = studioData.available_magazines || [];
  const filteredMags = availableMags.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.department_name && m.department_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.academic_year.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMags = (releases.featured_magazine_ids || [])
    .map((id) => availableMags.find((m) => m.id === id))
    .filter(Boolean) as typeof availableMags;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Section Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-4 flex items-center justify-between">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
            Publications Showcase
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
            Recent Releases & Featured Magazines
          </h2>
          <p className="text-xs text-[#55524D] mt-1">
            Control the curated selection, card ordering, metadata toggles, and display count for live published magazines.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer bg-[#F4EFEB] px-3 py-1.5 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]">
          <input
            type="checkbox"
            checked={releases.is_visible}
            onChange={(e) => updateField('is_visible', e.target.checked)}
            className="w-4 h-4 border-2 border-[#1A1A1A] accent-[#1B44B8]"
          />
          <span className="text-xs font-bold text-[#1A1A1A]">
            Section Visible
          </span>
        </label>
      </div>

      {/* Mode Selector (Automatic vs Manual Curation) */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Publication Selection Strategy
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => updateField('mode', 'automatic')}
            className={cn(
              'p-4 border-2 text-left transition-all cursor-pointer',
              releases.mode === 'automatic'
                ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] shadow-[3px_3px_0px_#1B44B8]'
                : 'border-[#1A1A1A]/40 bg-[#F4EFEB] text-[#1A1A1A] hover:bg-white'
            )}
          >
            <div className="font-bold text-xs mb-1">
              Automatic (Chronological Latest)
            </div>
            <p
              className={cn(
                'text-[11px] leading-snug',
                releases.mode === 'automatic' ? 'text-[#FAF7F2]/80' : 'text-[#55524D]'
              )}
            >
              Automatically showcases the newest peer-reviewed publications as they are approved and published.
            </p>
          </button>

          <button
            type="button"
            onClick={() => updateField('mode', 'manual')}
            className={cn(
              'p-4 border-2 text-left transition-all cursor-pointer',
              releases.mode === 'manual'
                ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] shadow-[3px_3px_0px_#1B44B8]'
                : 'border-[#1A1A1A]/40 bg-[#F4EFEB] text-[#1A1A1A] hover:bg-white'
            )}
          >
            <div className="font-bold text-xs mb-1">
              Manual Curated Selection & Order
            </div>
            <p
              className={cn(
                'text-[11px] leading-snug',
                releases.mode === 'manual' ? 'text-[#FAF7F2]/80' : 'text-[#55524D]'
              )}
            >
              Hand-pick specific published editions and define their exact sequence on the homepage.
            </p>
          </button>
        </div>
      </div>

      {/* Manual Selection Picker (Visible when mode is 'manual') */}
      {releases.mode === 'manual' && (
        <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]/20">
            <div>
              <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
                Curated Magazine Sequence
              </h3>
              <p className="text-[11px] text-[#55524D]">
                Selected ({selectedMags.length}) — Drag or use arrows to change display order
              </p>
            </div>
          </div>

          {/* Currently Selected & Ordered Magazines */}
          {selectedMags.length === 0 ? (
            <div className="p-6 border-2 border-dashed border-[#1A1A1A]/30 bg-[#F4EFEB] text-center text-xs font-mono text-[#77736C]">
              No magazines currently selected. Choose from the catalog below.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedMags.map((mag, idx) => (
                <div
                  key={mag.id}
                  className="flex items-center justify-between p-3 border-2 border-[#1A1A1A] bg-[#F4EFEB] shadow-[2px_2px_0px_#1A1A1A]"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#1B44B8] w-5">
                      #{idx + 1}
                    </span>
                    <div className="relative h-10 w-8 border border-[#1A1A1A] bg-[#EAE3D7] overflow-hidden shrink-0">
                      {mag.cover_image_url ? (
                        <Image
                          src={mag.cover_image_url}
                          alt={mag.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-[8px] font-mono">
                          N/A
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#1A1A1A]">
                        {mag.title}
                      </div>
                      <div className="text-[10px] font-mono text-[#77736C]">
                        {mag.department_name || 'Academic'} • {mag.academic_year}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveMagazineOrder(idx, 'up')}
                      className="p-1 border border-[#1A1A1A] bg-white hover:bg-[#EAE3D7] disabled:opacity-20 text-xs cursor-pointer"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === selectedMags.length - 1}
                      onClick={() => moveMagazineOrder(idx, 'down')}
                      className="p-1 border border-[#1A1A1A] bg-white hover:bg-[#EAE3D7] disabled:opacity-20 text-xs cursor-pointer"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFeaturedMagazine(mag.id)}
                      className="p-1 border border-[#1A1A1A] bg-white hover:bg-rose-100 text-rose-700 text-xs cursor-pointer"
                      title="Remove from Curated List"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Catalog Picker Search */}
          <div className="pt-4 border-t border-[#1A1A1A]/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#1A1A1A]">
                Add Published Magazines to Showcase
              </span>
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search catalog..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 border border-[#1A1A1A] bg-white text-xs text-[#1A1A1A] focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {filteredMags.map((mag) => {
                const isSelected = (releases.featured_magazine_ids || []).includes(mag.id);
                return (
                  <div
                    key={mag.id}
                    onClick={() => toggleFeaturedMagazine(mag.id)}
                    className={cn(
                      'flex items-center justify-between p-2.5 border-2 cursor-pointer transition-all',
                      isSelected
                        ? 'border-[#1B44B8] bg-[#1B44B8]/10 text-[#1B44B8]'
                        : 'border-[#1A1A1A]/20 bg-white hover:border-[#1A1A1A]'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative h-8 w-6 border border-[#1A1A1A] bg-[#EAE3D7] shrink-0 overflow-hidden">
                        {mag.cover_image_url ? (
                          <Image
                            src={mag.cover_image_url}
                            alt={mag.title}
                            fill
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-[#1A1A1A]">{mag.title}</div>
                        <div className="text-[10px] font-mono text-[#77736C]">
                          {mag.department_name} • {mag.academic_year}
                        </div>
                      </div>
                    </div>

                    <div className="px-2 py-1 text-xs font-mono font-bold flex items-center gap-1">
                      {isSelected ? (
                        <span className="text-[#1B44B8] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Featured
                        </span>
                      ) : (
                        <span className="text-gray-500 hover:text-[#1A1A1A]">
                          + Select
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Headings & Texts */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Section Headings & Display Count
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Eyebrow Label
            </label>
            <input
              type="text"
              value={releases.eyebrow}
              onChange={(e) => updateField('eyebrow', e.target.value)}
              placeholder="Recent Releases"
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Section Title
            </label>
            <input
              type="text"
              value={releases.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Newly Published"
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Subtitle Description
          </label>
          <textarea
            rows={2}
            value={releases.subtitle}
            onChange={(e) => updateField('subtitle', e.target.value)}
            className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-medium text-[#1A1A1A] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Max Visible Cards (Count)
            </label>
            <select
              value={releases.max_items}
              onChange={(e) => updateField('max_items', Number(e.target.value))}
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-bold text-[#1A1A1A] focus:bg-white focus:outline-none"
            >
              <option value={3}>3 Cards</option>
              <option value={4}>4 Cards (Standard 4-Column Grid)</option>
              <option value={6}>6 Cards</option>
              <option value={8}>8 Cards</option>
              <option value={12}>12 Cards</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Card Style Variant
            </label>
            <select
              value={releases.card_variant}
              onChange={(e) => updateField('card_variant', e.target.value as any)}
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-bold text-[#1A1A1A] focus:bg-white focus:outline-none"
            >
              <option value="standard">Standard Archival Card (Drop Shadow)</option>
              <option value="editorial">Editorial Press Cutout</option>
              <option value="compact">Compact Minimalist</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metadata Display Toggles */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Card Metadata Display Toggles
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={releases.show_department_badge}
              onChange={(e) => updateField('show_department_badge', e.target.checked)}
              className="w-4 h-4 accent-[#1B44B8]"
            />
            <span className="text-xs font-bold text-[#1A1A1A]">Show Department Badge</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={releases.show_academic_year}
              onChange={(e) => updateField('show_academic_year', e.target.checked)}
              className="w-4 h-4 accent-[#1B44B8]"
            />
            <span className="text-xs font-bold text-[#1A1A1A]">Show Academic Year</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={releases.show_edition}
              onChange={(e) => updateField('show_edition', e.target.checked)}
              className="w-4 h-4 accent-[#1B44B8]"
            />
            <span className="text-xs font-bold text-[#1A1A1A]">Show Edition / Volume</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={releases.show_page_count}
              onChange={(e) => updateField('show_page_count', e.target.checked)}
              className="w-4 h-4 accent-[#1B44B8]"
            />
            <span className="text-xs font-bold text-[#1A1A1A]">Show Page Count Badge</span>
          </label>
        </div>
      </div>
    </div>
  );
}
