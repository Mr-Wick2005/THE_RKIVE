'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  RotateCcw,
} from 'lucide-react';

interface ReaderToolbarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isTwoPageSpread: boolean;
  onToggleSpread?: () => void;
  canSpread?: boolean;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isThumbnailsOpen?: boolean;
  onToggleThumbnails?: () => void;
  isSearchOpen?: boolean;
  onToggleSearch?: () => void;
}

export function ReaderToolbar({
  currentPage,
  totalPages,
  onPageChange,
  isTwoPageSpread,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  isFullscreen,
  onToggleFullscreen,
}: ReaderToolbarProps) {
  const [pageInput, setPageInput] = useState<string>(String(currentPage));

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      onPageChange(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="fixed bottom-5 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
      <div className="bg-white/95 backdrop-blur-md border border-[#E8E2D8] rounded-full shadow-editorial px-3 py-1.5 flex items-center gap-1 sm:gap-2 pointer-events-auto transition-all text-[#171717]">
        {/* Previous Page */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={!hasPrev}
          className="p-2 rounded-full hover:bg-[#F8F6F1] disabled:opacity-30 disabled:hover:bg-transparent text-[#171717] transition-colors cursor-pointer"
          title="Previous Page (Left Arrow)"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Counter & Direct Jump Input */}
        <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 text-xs font-mono px-1">
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={() => setPageInput(String(currentPage))}
            className="w-10 text-center py-0.5 bg-[#F8F6F1] border border-[#E8E2D8] rounded text-xs font-semibold text-[#171717] focus:outline-none focus:ring-1 focus:ring-[#171717]"
            title="Jump to page number"
            aria-label="Jump to page number"
          />
          <span className="text-[#77736C]">/ {totalPages}</span>
        </form>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={!hasNext}
          className="p-2 rounded-full hover:bg-[#F8F6F1] disabled:opacity-30 disabled:hover:bg-transparent text-[#171717] transition-colors cursor-pointer"
          title="Next Page (Right Arrow / Space)"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-[#E8E2D8] mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onZoomOut}
            disabled={zoomLevel <= 1}
            className="p-2 rounded-full hover:bg-[#F8F6F1] disabled:opacity-30 text-[#77736C] hover:text-[#171717] transition-colors cursor-pointer"
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-mono text-[#77736C] w-11 text-center font-medium">
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            onClick={onZoomIn}
            disabled={zoomLevel >= 2.25}
            className="p-2 rounded-full hover:bg-[#F8F6F1] disabled:opacity-30 text-[#77736C] hover:text-[#171717] transition-colors cursor-pointer"
            title="Zoom In"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {zoomLevel > 1 && (
            <button
              onClick={onResetZoom}
              className="p-1.5 rounded-full hover:bg-[#F8F6F1] text-[#77736C] hover:text-[#171717] transition-colors cursor-pointer ml-0.5"
              title="Reset Zoom (Esc)"
              aria-label="Reset zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="h-4 w-px bg-[#E8E2D8] mx-1" />

        {/* Fullscreen Toggle */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-full hover:bg-[#F8F6F1] text-[#77736C] hover:text-[#171717] transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (F)'}
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
