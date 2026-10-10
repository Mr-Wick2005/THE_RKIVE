'use client';

import React from 'react';
import { Palette, Type, Square, Sliders } from 'lucide-react';
import {
  ThemeConfig,
  TypographyPreset,
  BorderStylePreset,
  SectionSpacingPreset,
} from '@/types/cms';
import { cn } from '@/lib/utils';

interface ThemeFormProps {
  theme: ThemeConfig;
  onChange: (updated: ThemeConfig) => void;
}

export function ThemeForm({ theme, onChange }: ThemeFormProps) {
  const updateField = <K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) => {
    onChange({ ...theme, [key]: value });
  };

  const colorPresets = [
    { label: 'Royal Ink (Default)', hex: '#1B44B8' },
    { label: 'Crimson Heritage', hex: '#C24A26' },
    { label: 'Editorial Emerald', hex: '#1F6F50' },
    { label: 'Classic Onyx', hex: '#1A1A1A' },
    { label: 'Academic Gold', hex: '#B58A55' },
  ];

  const surfacePresets = [
    { label: 'Warm Archival Paper', hex: '#FAF7F2' },
    { label: 'Antique Cream Desk', hex: '#F8F6F0' },
    { label: 'Pristine White Linen', hex: '#FFFFFF' },
    { label: 'Muted Press Tone', hex: '#EAE3D7' },
  ];

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Section Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-4">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
          Design System
        </span>
        <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
          Theme & Visual Appearance
        </h2>
        <p className="text-xs text-[#55524D] mt-1">
          Customize brand accent palettes, paper surface background tones, typography presets, and section density.
        </p>
      </div>

      {/* Primary Brand Accent Color */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Primary Accent Palette
        </h3>

        <div className="flex flex-wrap gap-2.5">
          {colorPresets.map((preset) => (
            <button
              key={preset.hex}
              type="button"
              onClick={() => updateField('accent_primary', preset.hex)}
              className={cn(
                'px-3 py-2 border-2 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer',
                theme.accent_primary === preset.hex
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] shadow-[2px_2px_0px_#1A1A1A]'
                  : 'border-[#1A1A1A]/30 bg-[#F4EFEB] text-[#1A1A1A] hover:border-[#1A1A1A]'
              )}
            >
              <span
                className="w-4 h-4 rounded-full border border-black/30 shrink-0"
                style={{ backgroundColor: preset.hex }}
              />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        <div className="pt-2 flex items-center gap-3">
          <label className="text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Custom Hex Color:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={theme.accent_primary}
              onChange={(e) => updateField('accent_primary', e.target.value)}
              className="w-8 h-8 p-0 border-2 border-[#1A1A1A] cursor-pointer"
            />
            <input
              type="text"
              value={theme.accent_primary}
              onChange={(e) => updateField('accent_primary', e.target.value)}
              className="w-28 px-2 py-1 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-mono font-bold uppercase"
            />
          </div>
        </div>
      </div>

      {/* Surface Background Tone */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Paper Surface Background Tone
        </h3>

        <div className="flex flex-wrap gap-2.5">
          {surfacePresets.map((preset) => (
            <button
              key={preset.hex}
              type="button"
              onClick={() => updateField('surface_background', preset.hex)}
              className={cn(
                'px-3 py-2 border-2 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer',
                theme.surface_background === preset.hex
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] shadow-[2px_2px_0px_#1A1A1A]'
                  : 'border-[#1A1A1A]/30 bg-[#F4EFEB] text-[#1A1A1A] hover:border-[#1A1A1A]'
              )}
            >
              <span
                className="w-4 h-4 rounded-full border border-black/30 shrink-0"
                style={{ backgroundColor: preset.hex }}
              />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Typography Presets */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Typography Preset
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'editorial-serif' as TypographyPreset,
              title: 'Editorial Serif (Default)',
              desc: 'Classic collegiate broadsheet with refined serif headlines & monospaced meta tags',
            },
            {
              id: 'modern-academic' as TypographyPreset,
              title: 'Modern Academic',
              desc: 'High-contrast contemporary styling tailored for modern journals',
            },
            {
              id: 'classic-press' as TypographyPreset,
              title: 'Classic Letterpress',
              desc: 'Timeless literary typography reminiscent of physical press volumes',
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => updateField('typography_preset', item.id)}
              className={cn(
                'p-3.5 border-2 text-left transition-all cursor-pointer',
                theme.typography_preset === item.id
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] shadow-[3px_3px_0px_#1B44B8]'
                  : 'border-[#1A1A1A]/30 bg-[#F4EFEB] text-[#1A1A1A] hover:border-[#1A1A1A]'
              )}
            >
              <div className="font-bold text-xs mb-1">{item.title}</div>
              <p
                className={cn(
                  'text-[10px] leading-snug',
                  theme.typography_preset === item.id ? 'text-[#FAF7F2]/80' : 'text-[#55524D]'
                )}
              >
                {item.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Section Spacing & Density */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Section Spacing & Density
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'compact' as SectionSpacingPreset, label: 'Compact Density', desc: 'Tight vertical padding (py-10)' },
            { id: 'normal' as SectionSpacingPreset, label: 'Standard Balance', desc: 'Balanced archival layout (py-16 to py-20)' },
            { id: 'generous' as SectionSpacingPreset, label: 'Generous Luxury', desc: 'Spacious editorial flow (py-24)' },
          ].map((sp) => (
            <button
              key={sp.id}
              type="button"
              onClick={() => updateField('section_spacing', sp.id)}
              className={cn(
                'p-3 border-2 text-left transition-all cursor-pointer',
                theme.section_spacing === sp.id
                  ? 'border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] shadow-[2px_2px_0px_#1B44B8]'
                  : 'border-[#1A1A1A]/30 bg-[#F4EFEB] text-[#1A1A1A]'
              )}
            >
              <div className="font-bold text-xs">{sp.label}</div>
              <div
                className={cn(
                  'text-[10px] mt-0.5',
                  theme.section_spacing === sp.id ? 'text-[#FAF7F2]/80' : 'text-[#77736C]'
                )}
              >
                {sp.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
