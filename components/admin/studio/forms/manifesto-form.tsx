'use client';

import React from 'react';
import { BookmarkCheck, Plus, Trash2 } from 'lucide-react';
import { ArchiveManifestoConfig, ManifestoBadge } from '@/types/cms';

interface ManifestoFormProps {
  manifesto: ArchiveManifestoConfig;
  onChange: (updated: ArchiveManifestoConfig) => void;
}

export function ManifestoForm({ manifesto, onChange }: ManifestoFormProps) {
  const updateField = <K extends keyof ArchiveManifestoConfig>(
    key: K,
    value: ArchiveManifestoConfig[K]
  ) => {
    onChange({ ...manifesto, [key]: value });
  };

  const updateBadge = (index: number, text: string) => {
    const updated = [...manifesto.badges];
    updated[index] = { ...updated[index], text };
    updateField('badges', updated);
  };

  const addBadge = () => {
    const newId = `b-${Date.now()}`;
    updateField('badges', [
      ...manifesto.badges,
      { id: newId, icon: 'ShieldCheck', text: 'Peer Reviewed' },
    ]);
  };

  const removeBadge = (index: number) => {
    updateField(
      'badges',
      manifesto.badges.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Section Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-4 flex items-center justify-between">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
            Institutional Governance Area
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
            Archive Manifesto & Principles
          </h2>
          <p className="text-xs text-[#55524D] mt-1">
            Highlight academic integrity, faculty review badges, and open access principles.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer bg-[#F4EFEB] px-3 py-1.5 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]">
          <input
            type="checkbox"
            checked={manifesto.is_visible}
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
          Manifesto Statement
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Eyebrow
            </label>
            <input
              type="text"
              value={manifesto.eyebrow}
              onChange={(e) => updateField('eyebrow', e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Headline
            </label>
            <input
              type="text"
              value={manifesto.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Description Body
          </label>
          <textarea
            rows={3}
            value={manifesto.description}
            onChange={(e) => updateField('description', e.target.value)}
            className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-medium text-[#1A1A1A] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Badges List */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]/20">
          <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
            Governance Trust Badges
          </h3>
          <button
            type="button"
            onClick={addBadge}
            className="px-3 py-1 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] hover:bg-[#1B44B8] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Badge</span>
          </button>
        </div>

        <div className="space-y-2">
          {manifesto.badges.map((b, idx) => (
            <div
              key={b.id || idx}
              className="flex items-center gap-3 p-2.5 border-2 border-[#1A1A1A] bg-[#F4EFEB]"
            >
              <input
                type="text"
                value={b.text}
                onChange={(e) => updateBadge(idx, e.target.value)}
                className="flex-1 px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-semibold text-[#1A1A1A]"
              />
              <button
                type="button"
                onClick={() => removeBadge(idx)}
                className="p-1 text-rose-700 hover:text-rose-900"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
