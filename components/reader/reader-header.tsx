'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Share2 } from 'lucide-react';

interface ReaderHeaderProps {
  magazineTitle: string;
  magazineSlug: string;
  departmentName?: string;
  currentPage: number;
  totalPages: number;
  onShare?: () => void;
}

export function ReaderHeader({
  magazineTitle,
  magazineSlug,
  departmentName,
  currentPage,
  totalPages,
  onShare,
}: ReaderHeaderProps) {
  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-[#F8F6F1]/95 backdrop-blur-md border-b border-[#E8E2D8] transition-all">
      {/* Top Academic Sub-bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Exit & Identity */}
        <div className="flex items-center gap-3">
          <Link
            href={`/magazine/${magazineSlug}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-[#E8E2D8] bg-white text-xs font-medium text-[#171717] hover:bg-[#171717] hover:text-[#F8F6F1] hover:border-[#171717] transition-all shadow-2xs"
            title="Exit Reader"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit Reader</span>
          </Link>

          <div className="border-l border-[#E8E2D8] pl-3 hidden md:block">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#77736C]">
              College Digital Archive
            </span>
          </div>
        </div>

        {/* Center: Title & Department */}
        <div className="text-center truncate max-w-md">
          <h1 className="font-serif font-semibold text-xs sm:text-sm text-[#171717] truncate">
            {magazineTitle}
          </h1>
          {departmentName && (
            <p className="text-[10px] font-mono text-[#77736C] truncate hidden sm:block">
              {departmentName}
            </p>
          )}
        </div>

        {/* Right: Reading Progress & Share */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#77736C]">
            <span className="text-[#171717] font-semibold">{progressPercent}%</span>
            <span>read</span>
          </div>

          {onShare && (
            <button
              onClick={onShare}
              className="p-1.5 rounded-sm border border-[#E8E2D8] bg-white text-[#77736C] hover:text-[#171717] hover:bg-[#F0EBE1] transition-colors"
              title="Share Publication"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Thin Reading Progress Indicator */}
      <div className="h-0.5 w-full bg-[#E8E2D8]">
        <div
          className="h-full bg-[#B58A55] transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  );
}
