'use client';

import React, { useState } from 'react';
import { X, Search, BookOpen, ArrowRight } from 'lucide-react';
import { MagazinePage } from '@/types/magazine';

interface ReaderSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pages: MagazinePage[];
  onSelectPage: (pageNumber: number) => void;
}

export function ReaderSearchDrawer({
  isOpen,
  onClose,
  pages,
  onSelectPage,
}: ReaderSearchDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Search by page number or navigation index
  const queryNum = parseInt(searchQuery.trim(), 10);
  const matchedPages = !isNaN(queryNum) && queryNum >= 1 && queryNum <= pages.length
    ? pages.filter((p) => p.page_number === queryNum)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-2xs pointer-events-auto transition-opacity"
      />

      {/* Drawer Container */}
      <aside className="relative w-full max-w-sm sm:max-w-md bg-white border-l border-[#E8E2D8] shadow-2xl h-full flex flex-col pointer-events-auto z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E8E2D8] flex items-center justify-between bg-[#F8F6F1]">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#B58A55]" />
            <h3 className="font-serif font-semibold text-sm text-[#171717]">
              Magazine Index & Search
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-[#77736C] hover:text-[#171717] hover:bg-[#E8E2D8]/50 transition-colors"
            title="Close Search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-[#E8E2D8] bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#77736C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by page number (e.g. 5, 12)..."
              className="w-full pl-9 pr-3 py-2 bg-[#F8F6F1] border border-[#E8E2D8] rounded-sm text-xs text-[#171717] placeholder:text-[#77736C] focus:outline-none focus:ring-1 focus:ring-[#171717]"
              autoFocus
            />
          </div>
        </div>

        {/* Content / Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {searchQuery.trim() ? (
            matchedPages.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#77736C]">
                  Matching Pages
                </span>
                {matchedPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => {
                      onSelectPage(page.page_number);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-sm border border-[#E8E2D8] hover:border-[#171717] hover:bg-[#F8F6F1] transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4 text-[#B58A55]" />
                      <span className="text-xs font-serif font-semibold text-[#171717]">
                        Jump to Page {page.page_number}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#77736C] group-hover:text-[#171717] transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-[#77736C]">
                No matching page numbers found for &ldquo;{searchQuery}&rdquo;.
              </div>
            )
          ) : (
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#77736C] block">
                Quick Navigation
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onSelectPage(1);
                    onClose();
                  }}
                  className="p-2.5 rounded-sm border border-[#E8E2D8] bg-[#F8F6F1] hover:bg-white text-xs font-mono text-[#171717] text-left transition-colors"
                >
                  Cover (Page 1)
                </button>
                {pages.length > 1 && (
                  <button
                    onClick={() => {
                      onSelectPage(Math.floor(pages.length / 2));
                      onClose();
                    }}
                    className="p-2.5 rounded-sm border border-[#E8E2D8] bg-[#F8F6F1] hover:bg-white text-xs font-mono text-[#171717] text-left transition-colors"
                  >
                    Middle (Page {Math.floor(pages.length / 2)})
                  </button>
                )}
                {pages.length > 1 && (
                  <button
                    onClick={() => {
                      onSelectPage(pages.length);
                      onClose();
                    }}
                    className="p-2.5 rounded-sm border border-[#E8E2D8] bg-[#F8F6F1] hover:bg-white text-xs font-mono text-[#171717] text-left transition-colors"
                  >
                    Back Cover (Page {pages.length})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
