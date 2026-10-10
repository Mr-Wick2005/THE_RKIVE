'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { AboutSectionConfig, AboutLayoutVariant } from '@/types/cms';
import { cn } from '@/lib/utils';

interface AboutFormProps {
  about: AboutSectionConfig;
  onChange: (updated: AboutSectionConfig) => void;
  onOpenMediaLibrary: (onSelect: (url: string) => void) => void;
}

export function AboutForm({ about, onChange, onOpenMediaLibrary }: AboutFormProps) {
  const updateField = <K extends keyof AboutSectionConfig>(
    key: K,
    value: AboutSectionConfig[K]
  ) => {
    onChange({ ...about, [key]: value });
  };

  const updateParagraph = (index: number, text: string) => {
    const updated = [...about.body_paragraphs];
    updated[index] = text;
    updateField('body_paragraphs', updated);
  };

  const addParagraph = () => {
    updateField('body_paragraphs', [
      ...about.body_paragraphs,
      'New editorial mission paragraph detailing academic governance and publication standards.',
    ]);
  };

  const removeParagraph = (index: number) => {
    const updated = about.body_paragraphs.filter((_, i) => i !== index);
    updateField('body_paragraphs', updated);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Section Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-4 flex items-center justify-between">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
            Editorial Mission Area
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
            About THE RKIVE & Artwork
          </h2>
          <p className="text-xs text-[#55524D] mt-1">
            Customize the editorial archive mission story, framed artwork canvas, and CTA destination.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer bg-[#F4EFEB] px-3 py-1.5 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]">
          <input
            type="checkbox"
            checked={about.is_visible}
            onChange={(e) => updateField('is_visible', e.target.checked)}
            className="w-4 h-4 border-2 border-[#1A1A1A] accent-[#1B44B8]"
          />
          <span className="text-xs font-bold text-[#1A1A1A]">
            Section Visible
          </span>
        </label>
      </div>

      {/* Headings */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Mission Headings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Eyebrow Label
            </label>
            <input
              type="text"
              value={about.eyebrow}
              onChange={(e) => updateField('eyebrow', e.target.value)}
              placeholder="Editorial Archive & Mission"
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Section Title
            </label>
            <input
              type="text"
              value={about.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="About THE RKIVE"
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Body Paragraphs */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]/20">
          <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
            Mission Statement Paragraphs
          </h3>
          <button
            type="button"
            onClick={addParagraph}
            className="px-3 py-1 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] hover:bg-[#1B44B8] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 shadow-[2px_2px_0px_#1A1A1A] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Paragraph</span>
          </button>
        </div>

        <div className="space-y-3">
          {about.body_paragraphs.map((para, idx) => (
            <div
              key={idx}
              className="p-3 border-2 border-[#1A1A1A] bg-[#F4EFEB] space-y-2 shadow-[2px_2px_0px_#1A1A1A]"
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold text-[#55524D]">
                <span>Paragraph #{idx + 1}</span>
                {about.body_paragraphs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeParagraph(idx)}
                    className="p-1 text-rose-700 hover:text-rose-900 cursor-pointer"
                    title="Remove Paragraph"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={para}
                onChange={(e) => updateParagraph(idx, e.target.value)}
                className="w-full px-2.5 py-2 border border-[#1A1A1A] bg-white text-xs text-[#1A1A1A] focus:outline-none leading-relaxed"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Framed Artwork Image Asset */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Framed Artwork Canvas Image
        </h3>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="relative h-32 w-32 border-2 border-[#1A1A1A] bg-[#EAE3D7] overflow-hidden shrink-0 shadow-[2px_2px_0px_#1A1A1A]">
            {about.image_url ? (
              <Image
                src={about.image_url}
                alt={about.image_alt || 'Artwork'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs font-mono">
                No Image
              </div>
            )}
          </div>

          <div className="flex-1 w-full space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
                Artwork Image URL
              </label>
              <input
                type="text"
                value={about.image_url}
                onChange={(e) => updateField('image_url', e.target.value)}
                placeholder="/images/rkive-painting.png"
                className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-mono text-[#1A1A1A] focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                onOpenMediaLibrary((url) => updateField('image_url', url))
              }
              className="px-3.5 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] hover:bg-[#EAE3D7] text-xs font-mono font-bold flex items-center gap-1.5 shadow-[1px_1px_0px_#1A1A1A] cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#1B44B8]" />
              <span>Choose from Media Library</span>
            </button>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          About Section CTA Button
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Button Label
            </label>
            <input
              type="text"
              value={about.cta.label}
              onChange={(e) =>
                updateField('cta', { ...about.cta, label: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Destination Route
            </label>
            <input
              type="text"
              value={about.cta.href}
              onChange={(e) =>
                updateField('cta', { ...about.cta, href: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-mono text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
