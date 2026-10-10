'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Trash2, Eye, EyeOff, GripVertical, Image as ImageIcon } from 'lucide-react';
import { HeaderConfig, NavLinkItem } from '@/types/cms';

interface HeaderFormProps {
  header: HeaderConfig;
  onChange: (updated: HeaderConfig) => void;
  onOpenMediaLibrary: (onSelect: (url: string) => void) => void;
}

export function HeaderForm({ header, onChange, onOpenMediaLibrary }: HeaderFormProps) {
  const updateField = <K extends keyof HeaderConfig>(key: K, value: HeaderConfig[K]) => {
    onChange({ ...header, [key]: value });
  };

  const updateNavLink = (index: number, updatedItem: Partial<NavLinkItem>) => {
    const updated = [...header.nav_links];
    updated[index] = { ...updated[index], ...updatedItem };
    updateField('nav_links', updated);
  };

  const addNavLink = () => {
    const newId = `nav-${Date.now()}`;
    const updated = [
      ...header.nav_links,
      { id: newId, label: 'New Link', href: '/magazines', is_visible: true },
    ];
    updateField('nav_links', updated);
  };

  const removeNavLink = (index: number) => {
    const updated = header.nav_links.filter((_, i) => i !== index);
    updateField('nav_links', updated);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Section Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-4">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
          Masthead Architecture
        </span>
        <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
          Header & Navigation
        </h2>
        <p className="text-xs text-[#55524D] mt-1">
          Configure the public masthead branding, logo assets, navigation links, and administrative CTA button.
        </p>
      </div>

      {/* Brand Identity & Logo */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-5">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Brand Logo & Identity
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Brand Name
            </label>
            <input
              type="text"
              value={header.brand_name}
              onChange={(e) => updateField('brand_name', e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Tagline / Subtitle
            </label>
            <input
              type="text"
              value={header.tagline}
              onChange={(e) => updateField('tagline', e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Logo Preview & URL */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Logo Image Asset
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative h-16 w-48 border-2 border-[#1A1A1A] bg-[#EAE3D7] p-2 flex items-center justify-center overflow-hidden">
              {header.logo_url ? (
                <Image
                  src={header.logo_url}
                  alt={header.logo_alt || 'Logo'}
                  fill
                  className="object-contain p-1"
                />
              ) : (
                <span className="text-[10px] font-mono text-gray-500">No Logo</span>
              )}
            </div>

            <div className="flex-1 w-full space-y-2">
              <input
                type="text"
                value={header.logo_url}
                onChange={(e) => updateField('logo_url', e.target.value)}
                placeholder="/images/the-rkive-logo.png"
                className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-mono text-[#1A1A1A] focus:bg-white focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onOpenMediaLibrary((url) => updateField('logo_url', url))
                  }
                  className="px-3 py-1.5 border-2 border-[#1A1A1A] bg-[#F4EFEB] hover:bg-[#EAE3D7] text-xs font-mono font-bold flex items-center gap-1.5 shadow-[1px_1px_0px_#1A1A1A] cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#1B44B8]" />
                  <span>Choose from Media Library</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]/20">
          <h3 className="font-serif text-base font-bold text-[#1A1A1A]">
            Navigation Menu Links
          </h3>
          <button
            type="button"
            onClick={addNavLink}
            className="px-3 py-1 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] hover:bg-[#1B44B8] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1 shadow-[2px_2px_0px_#1A1A1A] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </button>
        </div>

        <div className="space-y-3">
          {header.nav_links.map((link, idx) => (
            <div
              key={link.id || idx}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 border-2 border-[#1A1A1A] bg-[#F4EFEB] shadow-[2px_2px_0px_#1A1A1A]"
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={link.label}
                  placeholder="Label (e.g. Magazine Archive)"
                  onChange={(e) => updateNavLink(idx, { label: e.target.value })}
                  className="px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-semibold text-[#1A1A1A] focus:outline-none"
                />
                <input
                  type="text"
                  value={link.href}
                  placeholder="Destination (e.g. /magazines)"
                  onChange={(e) => updateNavLink(idx, { href: e.target.value })}
                  className="px-2.5 py-1.5 border border-[#1A1A1A] bg-white text-xs font-mono text-[#1A1A1A] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={() => updateNavLink(idx, { is_visible: !link.is_visible })}
                  title={link.is_visible ? 'Hide Link' : 'Show Link'}
                  className="p-1.5 border border-[#1A1A1A] bg-white hover:bg-[#EAE3D7] text-xs font-mono"
                >
                  {link.is_visible ? (
                    <Eye className="w-3.5 h-3.5 text-[#2B6E3F]" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => removeNavLink(idx)}
                  title="Remove Link"
                  className="p-1.5 border border-[#1A1A1A] bg-white hover:bg-rose-100 text-rose-700 text-xs font-mono"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Header CTA Button */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Masthead CTA Button (Editorial Desk)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Button Label
            </label>
            <input
              type="text"
              value={header.cta_button.label}
              onChange={(e) =>
                updateField('cta_button', { ...header.cta_button, label: e.target.value })
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
              value={header.cta_button.href}
              onChange={(e) =>
                updateField('cta_button', { ...header.cta_button, href: e.target.value })
              }
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-mono text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={header.cta_button.is_visible}
              onChange={(e) =>
                updateField('cta_button', {
                  ...header.cta_button,
                  is_visible: e.target.checked,
                })
              }
              className="w-4 h-4 border-2 border-[#1A1A1A] accent-[#1B44B8]"
            />
            <span className="text-xs font-bold text-[#1A1A1A]">
              Display CTA Button in Masthead
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
