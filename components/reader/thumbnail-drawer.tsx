'use client';

import React from 'react';
import Image from 'next/image';
import { X, Layers } from 'lucide-react';
import { MagazinePage } from '@/types/magazine';

interface ThumbnailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pages: MagazinePage[];
  currentPage: number;
  onSelectPage: (pageNumber: number) => void;
}

export function ThumbnailDrawer({
  isOpen,
  onClose,
  pages,
  currentPage,
  onSelectPage,
}: ThumbnailDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-2xs pointer-events-auto transition-opacity"
      />

      {/* Drawer Container */}
      <aside className="relative w-full max-w-sm sm:max-w-md bg-white border-l border-[#E8E2D8] shadow-2xl h-full flex flex-col pointer-events-auto z-10">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[#E8E2D8] flex items-center justify-between bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#B58A55]" />
            <h3 className="font-serif font-semibold text-sm text-[#171717]">
              Page Thumbnails ({pages.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-[#77736C] hover:text-[#171717] hover:bg-[#E8E2D8]/50 transition-colors"
            title="Close Thumbnails"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thumbnails Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pages.map((page) => {
              const isActive = currentPage === page.page_number;
              return (
                <button
                  key={page.id}
                  onClick={() => {
                    onSelectPage(page.page_number);
                    onClose();
                  }}
                  className={`group flex flex-col items-center text-center p-1.5 rounded-sm border transition-all ${
                    isActive
                      ? 'border-[#171717] bg-[#F8F6F1] ring-2 ring-[#171717]/20 scale-102'
                      : 'border-[#E8E2D8] hover:border-[#77736C] hover:bg-[#F8F6F1]/50'
                  }`}
                >
                  <div className="relative w-full aspect-[1/1.414] bg-stone-100 rounded-xs overflow-hidden shadow-2xs">
                    <Image
                      src={page.thumbnail_path || page.image_path}
                      alt={`Page ${page.page_number}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 140px, 180px"
                    />
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] font-mono ${
                      isActive ? 'font-bold text-[#171717]' : 'text-[#77736C] group-hover:text-[#171717]'
                    }`}
                  >
                    Page {page.page_number}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
