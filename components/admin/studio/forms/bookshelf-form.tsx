'use client';

import React from 'react';
import { Library } from 'lucide-react';
import { BookshelfSectionConfig } from '@/types/cms';

interface BookshelfFormProps {
  bookshelf: BookshelfSectionConfig;
  onChange: (updated: BookshelfSectionConfig) => void;
}

export function BookshelfForm({ bookshelf, onChange }: BookshelfFormProps) {
  const updateField = <K extends keyof BookshelfSectionConfig>(
    key: K,
    value: BookshelfSectionConfig[K]
  ) => {
    onChange({ ...bookshelf, [key]: value });
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Section Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-4 flex items-center justify-between">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
            Interactive Shelf
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
            The Digital Bookshelf
          </h2>
          <p className="text-xs text-[#55524D] mt-1">
            Display publications as tactile, 3D physical spine volumes on an interactive wooden bookshelf.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer bg-[#F4EFEB] px-3 py-1.5 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]">
          <input
            type="checkbox"
            checked={bookshelf.is_visible}
            onChange={(e) => updateField('is_visible', e.target.checked)}
            className="w-4 h-4 border-2 border-[#1A1A1A] accent-[#1B44B8]"
          />
          <span className="text-xs font-bold text-[#1A1A1A]">
            Section Visible
          </span>
        </label>
      </div>

      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Bookshelf Headings & Capacity
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Eyebrow Label
            </label>
            <input
              type="text"
              value={bookshelf.eyebrow}
              onChange={(e) => updateField('eyebrow', e.target.value)}
              placeholder="Interactive Browsing"
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Section Title
            </label>
            <input
              type="text"
              value={bookshelf.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="The Digital Bookshelf"
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
            value={bookshelf.subtitle}
            onChange={(e) => updateField('subtitle', e.target.value)}
            className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-medium text-[#1A1A1A] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Max Books on Shelf
          </label>
          <select
            value={bookshelf.max_items}
            onChange={(e) => updateField('max_items', Number(e.target.value))}
            className="w-full sm:w-48 px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-bold text-[#1A1A1A]"
          >
            <option value={4}>4 Volumes</option>
            <option value={6}>6 Volumes</option>
            <option value={8}>8 Volumes</option>
            <option value={10}>10 Volumes</option>
          </select>
        </div>
      </div>
    </div>
  );
}
