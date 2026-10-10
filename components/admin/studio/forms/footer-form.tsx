'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Trash2, PanelBottom, Image as ImageIcon } from 'lucide-react';
import { FooterConfig, FooterLinkItem, SocialLinkItem } from '@/types/cms';

interface FooterFormProps {
  footer: FooterConfig;
  onChange: (updated: FooterConfig) => void;
  onOpenMediaLibrary: (onSelect: (url: string) => void) => void;
}

export function FooterForm({ footer, onChange, onOpenMediaLibrary }: FooterFormProps) {
  const updateField = <K extends keyof FooterConfig>(key: K, value: FooterConfig[K]) => {
    onChange({ ...footer, [key]: value });
  };

  const updateQuickLink = (index: number, updated: Partial<FooterLinkItem>) => {
    const links = [...footer.quick_links];
    links[index] = { ...links[index], ...updated };
    updateField('quick_links', links);
  };

  const addQuickLink = () => {
    updateField('quick_links', [
      ...footer.quick_links,
      { id: `ql-${Date.now()}`, label: 'New Link', href: '/' },
    ]);
  };

  const removeQuickLink = (index: number) => {
    updateField('quick_links', footer.quick_links.filter((_, i) => i !== index));
  };

  const updateFacultyLink = (index: number, updated: Partial<FooterLinkItem>) => {
    const links = [...footer.faculty_links];
    links[index] = { ...links[index], ...updated };
    updateField('faculty_links', links);
  };

  const addFacultyLink = () => {
    updateField('faculty_links', [
      ...footer.faculty_links,
      { id: `fl-${Date.now()}`, label: 'Faculty Name', href: '/#departments' },
    ]);
  };

  const removeFacultyLink = (index: number) => {
    updateField('faculty_links', footer.faculty_links.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Section Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-4">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
          Footer Architecture
        </span>
        <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
          Footer, Directories & Credits
        </h2>
        <p className="text-xs text-[#55524D] mt-1">
          Customize footer masthead description, link directories, copyright label, and developer credits.
        </p>
      </div>

      {/* Brand Description & Logo */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Footer Masthead & Badge
        </h3>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Archival Brand Description
          </label>
          <textarea
            rows={3}
            value={footer.brand_description}
            onChange={(e) => updateField('brand_description', e.target.value)}
            className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-medium text-[#1A1A1A] focus:bg-white focus:outline-none leading-relaxed"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Architecture Tag Badge Text
          </label>
          <input
            type="text"
            value={footer.badge_text}
            onChange={(e) => updateField('badge_text', e.target.value)}
            placeholder="Public Digital Library Architecture"
            className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]/20">
          <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
            Quick Navigation Links
          </h3>
          <button
            type="button"
            onClick={addQuickLink}
            className="px-3 py-1 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] hover:bg-[#1B44B8] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </button>
        </div>

        <div className="space-y-2">
          {footer.quick_links.map((link, idx) => (
            <div
              key={link.id || idx}
              className="flex items-center gap-2 p-2.5 border-2 border-[#1A1A1A] bg-[#F4EFEB]"
            >
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateQuickLink(idx, { label: e.target.value })}
                className="flex-1 px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-semibold"
                placeholder="Label"
              />
              <input
                type="text"
                value={link.href}
                onChange={(e) => updateQuickLink(idx, { href: e.target.value })}
                className="flex-1 px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-mono"
                placeholder="URL (e.g. /magazines)"
              />
              <button
                type="button"
                onClick={() => removeQuickLink(idx)}
                className="p-1.5 text-rose-700 hover:text-rose-900"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Academic Faculties Links */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]/20">
          <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
            Faculty Links Column
          </h3>
          <button
            type="button"
            onClick={addFacultyLink}
            className="px-3 py-1 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] hover:bg-[#1B44B8] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Faculty</span>
          </button>
        </div>

        <div className="space-y-2">
          {footer.faculty_links.map((link, idx) => (
            <div
              key={link.id || idx}
              className="flex items-center gap-2 p-2.5 border-2 border-[#1A1A1A] bg-[#F4EFEB]"
            >
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateFacultyLink(idx, { label: e.target.value })}
                className="flex-1 px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-semibold"
                placeholder="Faculty Name"
              />
              <input
                type="text"
                value={link.href}
                onChange={(e) => updateFacultyLink(idx, { href: e.target.value })}
                className="flex-1 px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-mono"
                placeholder="Route (e.g. /department/slug)"
              />
              <button
                type="button"
                onClick={() => removeFacultyLink(idx)}
                className="p-1.5 text-rose-700 hover:text-rose-900"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright & Credits */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Copyright & Developer Credits
        </h3>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Copyright Statement Text
          </label>
          <input
            type="text"
            value={footer.copyright_text}
            onChange={(e) => updateField('copyright_text', e.target.value)}
            className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Developer 1 Name
            </label>
            <input
              type="text"
              value={footer.credits_developer_1}
              onChange={(e) => updateField('credits_developer_1', e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-bold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Developer 2 Name
            </label>
            <input
              type="text"
              value={footer.credits_developer_2}
              onChange={(e) => updateField('credits_developer_2', e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-bold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
