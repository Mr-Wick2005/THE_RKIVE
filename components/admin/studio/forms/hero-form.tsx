'use client';

import React from 'react';
import { Type, Sparkles, Layers, BookOpen, Film, Image as ImageIcon, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { HeroConfig, HeroLayoutVariant, HeroStatItem } from '@/types/cms';
import { cn } from '@/lib/utils';

interface HeroFormProps {
  hero: HeroConfig;
  onChange: (updated: HeroConfig) => void;
  onOpenMediaLibrary: (onSelect: (url: string) => void) => void;
}

export function HeroForm({ hero, onChange, onOpenMediaLibrary }: HeroFormProps) {
  const updateField = <K extends keyof HeroConfig>(key: K, value: HeroConfig[K]) => {
    onChange({ ...hero, [key]: value });
  };

  const updateStat = (index: number, updatedStat: Partial<HeroStatItem>) => {
    const updated = [...hero.stats];
    updated[index] = { ...updated[index], ...updatedStat };
    updateField('stats', updated);
  };

  const addStat = () => {
    const newId = `stat-${Date.now()}`;
    const updated = [
      ...hero.stats,
      { id: newId, value: '100%', label: 'Peer Governed', is_visible: true },
    ];
    updateField('stats', updated);
  };

  const removeStat = (index: number) => {
    const updated = hero.stats.filter((_, i) => i !== index);
    updateField('stats', updated);
  };

  const layoutVariants: Array<{
    id: HeroLayoutVariant;
    name: string;
    description: string;
    icon: React.ElementType;
  }> = [
    {
      id: 'split-video',
      name: 'Split: Typography + Video Reel',
      description: 'Bold editorial typography on left, continuous archive video reel on right (Default)',
      icon: Film,
    },
    {
      id: 'split-artwork',
      name: 'Split: Typography + Framed Artwork',
      description: 'Editorial typography on left, high-resolution framed artwork on right',
      icon: ImageIcon,
    },
    {
      id: 'centered',
      name: 'Centered Editorial Banner',
      description: 'Large centered headline, supporting text, and centered CTAs',
      icon: Type,
    },
    {
      id: 'minimal',
      name: 'Minimal Clean Press',
      description: 'Pure typography and high-density academic statistics',
      icon: Layers,
    },
  ];

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Section Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-4 flex items-center justify-between">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
            Hero Area
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
            Hero Section & Typography
          </h2>
          <p className="text-xs text-[#55524D] mt-1">
            Customize the primary headline, mission subtitle, call-to-action buttons, layout style, and stats badges.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer bg-[#F4EFEB] px-3 py-1.5 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]">
          <input
            type="checkbox"
            checked={hero.is_visible}
            onChange={(e) => updateField('is_visible', e.target.checked)}
            className="w-4 h-4 border-2 border-[#1A1A1A] accent-[#1B44B8]"
          />
          <span className="text-xs font-bold text-[#1A1A1A]">
            Section Visible
          </span>
        </label>
      </div>

      {/* Layout Variant Selector */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Hero Layout Variant
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {layoutVariants.map((v) => {
            const Icon = v.icon;
            const isSelected = hero.layout_variant === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => updateField('layout_variant', v.id)}
                className={cn(
                  'p-4 border-2 text-left transition-all relative flex flex-col justify-between group cursor-pointer',
                  isSelected
                    ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] shadow-[3px_3px_0px_#1B44B8]'
                    : 'border-[#1A1A1A]/40 bg-[#F4EFEB] text-[#1A1A1A] hover:border-[#1A1A1A] hover:bg-white'
                )}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      isSelected ? 'text-[#FAF7F2]' : 'text-[#1B44B8]'
                    )}
                  />
                  <span className="font-bold text-xs">{v.name}</span>
                </div>
                <p
                  className={cn(
                    'text-[11px] leading-snug',
                    isSelected ? 'text-[#FAF7F2]/80' : 'text-[#55524D]'
                  )}
                >
                  {v.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Typography & Copy */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-5">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Headlines & Supporting Text
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Title Line 1
            </label>
            <input
              type="text"
              value={hero.title_line1}
              onChange={(e) => updateField('title_line1', e.target.value)}
              placeholder="Welcome to"
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-sm font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Title Line 2 (Brand Highlight)
            </label>
            <input
              type="text"
              value={hero.title_line2}
              onChange={(e) => updateField('title_line2', e.target.value)}
              placeholder="THE RKIVE"
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-sm font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Mission Statement / Subtitle
          </label>
          <textarea
            rows={3}
            value={hero.subtitle}
            onChange={(e) => updateField('subtitle', e.target.value)}
            className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-medium text-[#1A1A1A] focus:bg-white focus:outline-none leading-relaxed"
          />
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-5">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Hero Call-to-Action Buttons
        </h3>

        {/* Primary CTA */}
        <div className="p-4 border-2 border-[#1A1A1A] bg-[#F4EFEB] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase text-[#1B44B8]">
              Primary CTA Button (Solid Dark)
            </span>
            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={hero.primary_cta.is_visible}
                onChange={(e) =>
                  updateField('primary_cta', {
                    ...hero.primary_cta,
                    is_visible: e.target.checked,
                  })
                }
                className="w-3.5 h-3.5 border border-[#1A1A1A] accent-[#1B44B8]"
              />
              <span>Visible</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={hero.primary_cta.label}
              placeholder="Button Label"
              onChange={(e) =>
                updateField('primary_cta', { ...hero.primary_cta, label: e.target.value })
              }
              className="px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-semibold text-[#1A1A1A] focus:outline-none"
            />
            <input
              type="text"
              value={hero.primary_cta.href}
              placeholder="Destination (e.g. /magazines)"
              onChange={(e) =>
                updateField('primary_cta', { ...hero.primary_cta, href: e.target.value })
              }
              className="px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-mono text-[#1A1A1A] focus:outline-none"
            />
          </div>
        </div>

        {/* Secondary CTA */}
        <div className="p-4 border-2 border-[#1A1A1A] bg-[#F4EFEB] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase text-[#C24A26]">
              Secondary CTA Button (Light Outline)
            </span>
            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={hero.secondary_cta.is_visible}
                onChange={(e) =>
                  updateField('secondary_cta', {
                    ...hero.secondary_cta,
                    is_visible: e.target.checked,
                  })
                }
                className="w-3.5 h-3.5 border border-[#1A1A1A] accent-[#1B44B8]"
              />
              <span>Visible</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={hero.secondary_cta.label}
              placeholder="Button Label"
              onChange={(e) =>
                updateField('secondary_cta', { ...hero.secondary_cta, label: e.target.value })
              }
              className="px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-semibold text-[#1A1A1A] focus:outline-none"
            />
            <input
              type="text"
              value={hero.secondary_cta.href}
              placeholder="Destination (e.g. #departments)"
              onChange={(e) =>
                updateField('secondary_cta', { ...hero.secondary_cta, href: e.target.value })
              }
              className="px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-mono text-[#1A1A1A] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Micro Statistics */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]/20">
          <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
            Micro Statistics Badges
          </h3>
          <button
            type="button"
            onClick={addStat}
            className="px-3 py-1 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] hover:bg-[#1B44B8] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-[2px_2px_0px_#1A1A1A] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stat</span>
          </button>
        </div>

        <div className="space-y-3">
          {hero.stats.map((stat, idx) => (
            <div
              key={stat.id || idx}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 border-2 border-[#1A1A1A] bg-[#F4EFEB]"
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={stat.value}
                  placeholder="Value (e.g. 6 or 100%)"
                  onChange={(e) => updateStat(idx, { value: e.target.value })}
                  className="px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-bold text-[#1A1A1A] focus:outline-none"
                />
                <input
                  type="text"
                  value={stat.label}
                  placeholder="Label (e.g. Academic Faculties)"
                  onChange={(e) => updateStat(idx, { label: e.target.value })}
                  className="px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-semibold text-[#1A1A1A] focus:outline-none col-span-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <label className="flex items-center gap-1 text-[11px] font-mono cursor-pointer px-2 py-1 bg-white border border-[#1A1A1A]">
                  <input
                    type="checkbox"
                    checked={stat.is_dynamic}
                    onChange={(e) => updateStat(idx, { is_dynamic: e.target.checked })}
                    className="w-3 h-3 accent-[#1B44B8]"
                  />
                  <span>Live DB Count</span>
                </label>

                <button
                  type="button"
                  onClick={() => updateStat(idx, { is_visible: !stat.is_visible })}
                  className="p-1.5 border border-[#1A1A1A] bg-white hover:bg-[#EAE3D7] text-xs font-mono"
                  title={stat.is_visible ? 'Hide Stat' : 'Show Stat'}
                >
                  {stat.is_visible ? (
                    <Eye className="w-3.5 h-3.5 text-[#2B6E3F]" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => removeStat(idx)}
                  className="p-1.5 border border-[#1A1A1A] bg-white hover:bg-rose-100 text-rose-700 text-xs font-mono"
                  title="Remove Stat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
