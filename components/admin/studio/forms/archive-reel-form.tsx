'use client';

import React from 'react';
import { Film, Image as ImageIcon, Volume2, Maximize2, Play, Eye } from 'lucide-react';
import { ArchiveReelConfig } from '@/types/cms';

interface ArchiveReelFormProps {
  reel: ArchiveReelConfig;
  onChange: (updated: ArchiveReelConfig) => void;
  onOpenMediaLibrary: (onSelect: (url: string) => void) => void;
}

export function ArchiveReelForm({ reel, onChange, onOpenMediaLibrary }: ArchiveReelFormProps) {
  const updateField = <K extends keyof ArchiveReelConfig>(key: K, value: ArchiveReelConfig[K]) => {
    onChange({ ...reel, [key]: value });
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Section Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-4 flex items-center justify-between">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
            Media Archival Area
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
            Archive Reel Video & Player
          </h2>
          <p className="text-xs text-[#55524D] mt-1">
            Configure the hero section continuous looping video reel, poster frame, autoplay behavior, and playback controls.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer bg-[#F4EFEB] px-3 py-1.5 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]">
          <input
            type="checkbox"
            checked={reel.is_visible}
            onChange={(e) => updateField('is_visible', e.target.checked)}
            className="w-4 h-4 border-2 border-[#1A1A1A] accent-[#1B44B8]"
          />
          <span className="text-xs font-bold text-[#1A1A1A]">
            Section Visible
          </span>
        </label>
      </div>

      {/* Video Source & Poster */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-5">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Video Source & Poster Frame
        </h3>

        <div className="space-y-3">
          <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Video Asset URL (.mp4 / .webm)
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={reel.video_url}
              onChange={(e) => updateField('video_url', e.target.value)}
              placeholder="/hero-loop-video.mp4"
              className="flex-1 px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-mono text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onOpenMediaLibrary((url) => updateField('video_url', url))}
              className="px-3.5 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] hover:bg-[#EAE3D7] text-xs font-mono font-bold flex items-center gap-1.5 shadow-[1px_1px_0px_#1A1A1A] cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-[#1B44B8]" />
              <span>Select Video</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Poster Fallback Image URL
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={reel.poster_image_url}
              onChange={(e) => updateField('poster_image_url', e.target.value)}
              placeholder="/images/rkive-painting.png"
              className="flex-1 px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-mono text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onOpenMediaLibrary((url) => updateField('poster_image_url', url))}
              className="px-3.5 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] hover:bg-[#EAE3D7] text-xs font-mono font-bold flex items-center gap-1.5 shadow-[1px_1px_0px_#1A1A1A] cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#1B44B8]" />
              <span>Select Poster</span>
            </button>
          </div>
        </div>

        {/* Live Video Preview Box */}
        {reel.video_url && (
          <div className="pt-2">
            <label className="block text-xs font-mono font-bold uppercase text-[#55524D] mb-2">
              Video Player Preview
            </label>
            <div className="border-2 border-[#1A1A1A] bg-black aspect-video max-w-md overflow-hidden relative shadow-[3px_3px_0px_#1A1A1A]">
              <video
                src={reel.video_url}
                autoPlay={reel.auto_play}
                loop={reel.loop}
                muted={reel.muted_default}
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {/* Frame Labels & Captions */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Archival Frame Labels
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Top Frame Title
            </label>
            <input
              type="text"
              value={reel.badge_title}
              onChange={(e) => updateField('badge_title', e.target.value)}
              placeholder="THE RKIVE // ARCHIVE REEL"
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Loop Tag Badge
            </label>
            <input
              type="text"
              value={reel.loop_tag_text}
              onChange={(e) => updateField('loop_tag_text', e.target.value)}
              placeholder="CONTINUOUS LOOP"
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold text-[#1A1A1A] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
            Catalog Caption / Identifier
          </label>
          <input
            type="text"
            value={reel.caption}
            onChange={(e) => updateField('caption', e.target.value)}
            placeholder="Official Collegiate Archive Reel"
            className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-medium text-[#1A1A1A] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Playback Controls & Toggles */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20">
          Playback Behavior & Controls
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-2.5 p-3 border border-[#1A1A1A] bg-[#F4EFEB] cursor-pointer">
            <input
              type="checkbox"
              checked={reel.auto_play}
              onChange={(e) => updateField('auto_play', e.target.checked)}
              className="w-4 h-4 accent-[#1B44B8]"
            />
            <div>
              <span className="block text-xs font-bold text-[#1A1A1A]">Autoplay on Page Load</span>
              <span className="block text-[11px] text-[#77736C]">Starts playback automatically</span>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 border border-[#1A1A1A] bg-[#F4EFEB] cursor-pointer">
            <input
              type="checkbox"
              checked={reel.loop}
              onChange={(e) => updateField('loop', e.target.checked)}
              className="w-4 h-4 accent-[#1B44B8]"
            />
            <div>
              <span className="block text-xs font-bold text-[#1A1A1A]">Continuous Seamless Loop</span>
              <span className="block text-[11px] text-[#77736C]">Repeats reel endlessly</span>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 border border-[#1A1A1A] bg-[#F4EFEB] cursor-pointer">
            <input
              type="checkbox"
              checked={reel.muted_default}
              onChange={(e) => updateField('muted_default', e.target.checked)}
              className="w-4 h-4 accent-[#1B44B8]"
            />
            <div>
              <span className="block text-xs font-bold text-[#1A1A1A]">Muted by Default</span>
              <span className="block text-[11px] text-[#77736C]">Required for browser autoplay policy</span>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 border border-[#1A1A1A] bg-[#F4EFEB] cursor-pointer">
            <input
              type="checkbox"
              checked={reel.show_fullscreen_button}
              onChange={(e) => updateField('show_fullscreen_button', e.target.checked)}
              className="w-4 h-4 accent-[#1B44B8]"
            />
            <div>
              <span className="block text-xs font-bold text-[#1A1A1A]">Fullscreen Button</span>
              <span className="block text-[11px] text-[#77736C]">Allows viewer to expand video</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
