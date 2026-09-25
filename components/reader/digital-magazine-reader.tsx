'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { MagazineWithRelations, MagazinePage } from '@/types/magazine';
import { ReaderHeader } from '@/components/reader/reader-header';
import { ReaderToolbar } from '@/components/reader/reader-toolbar';
import { FlipbookStage, FlipbookStageRef } from '@/components/reader/flipbook-stage';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DigitalMagazineReaderProps {
  magazine: MagazineWithRelations;
  initialPages: MagazinePage[];
}

export function DigitalMagazineReader({
  magazine,
  initialPages,
}: DigitalMagazineReaderProps) {
  const searchParams = useSearchParams();

  // If initialPages is empty (e.g. preview fallback), build fallback items
  const pages: MagazinePage[] = initialPages.length > 0
    ? initialPages
    : Array.from({ length: Math.max(1, magazine.page_count || 1) }, (_, i) => ({
        id: `mock-page-${i + 1}`,
        magazine_id: magazine.id,
        page_number: i + 1,
        image_path: magazine.cover_image_url || '/placeholder-cover.jpg',
        thumbnail_path: magazine.cover_image_url || '/placeholder-cover.jpg',
        width: 1200,
        height: 1697,
        file_size: 150000,
        mime_type: 'image/webp',
        render_version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

  const totalPages = pages.length;

  // Initial page from URL query ?page=X
  const initialPageParam = parseInt(searchParams.get('page') || '1', 10);
  const validInitialPage = !isNaN(initialPageParam) && initialPageParam >= 1 && initialPageParam <= totalPages
    ? initialPageParam
    : 1;

  const flipbookRef = useRef<FlipbookStageRef>(null);
  const [isReaderReady, setIsReaderReady] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(validInitialPage);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync URL query when page changes without full page reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', String(currentPage));
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentPage]);

  // Page change listener from FlipbookStage engine
  const handlePageChange = useCallback((pageNum: number) => {
    setCurrentPage(pageNum);
  }, []);

  const handleOrientationChange = useCallback((newOri: 'portrait' | 'landscape') => {
    setOrientation(newOri);
  }, []);

  // Jump to specific page
  const handleJumpToPage = useCallback((targetPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, targetPage));
    if (isReaderReady) {
      flipbookRef.current?.goToPage(clamped, true);
    }
    setCurrentPage(clamped);
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [totalPages, zoomLevel, isReaderReady]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (!isReaderReady) return;
    flipbookRef.current?.flipNext();
  }, [isReaderReady]);

  const handlePrev = useCallback(() => {
    if (!isReaderReady) return;
    flipbookRef.current?.flipPrev();
  }, [isReaderReady]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'Home':
          e.preventDefault();
          handleJumpToPage(1);
          break;
        case 'End':
          e.preventDefault();
          handleJumpToPage(totalPages);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (zoomLevel > 1) {
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleJumpToPage, totalPages, zoomLevel]);

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.25, +(prev + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(1, +(prev - 0.25).toFixed(2));
      if (next === 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan interaction while zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Fullscreen API
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      }).catch(console.error);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Web Share API
  const handleShare = async () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${magazine.title} — College Digital Magazine`,
          text: `Read "${magazine.title}" on the College Digital Archive.`,
          url: currentUrl,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard?.writeText(currentUrl);
      alert('Publication URL copied to clipboard!');
    }
  };

  const isAtStart = currentPage <= 1 || !isReaderReady;
  const isAtEnd = currentPage >= totalPages || !isReaderReady;

  return (
    <div
      className="fixed inset-0 bg-[#F8F6F0] text-[#121210] select-none flex flex-col overflow-hidden z-30 font-sans"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
      }}
    >
      {/* Reader Minimal Top Header */}
      <ReaderHeader
        magazineTitle={magazine.title}
        magazineSlug={magazine.slug}
        departmentName={magazine.department?.name}
        currentPage={currentPage}
        totalPages={totalPages}
        onShare={handleShare}
      />

      {/* Main Reader Stage / Flipbook Stage */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-6 pt-14 pb-20 relative overflow-hidden">
        {/* Left Side Turn Hotzone Button (Desktop) */}
        <button
          onClick={handlePrev}
          disabled={isAtStart}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-16 sm:w-12 sm:h-20 bg-white/80 hover:bg-white border border-[#E8E2D8] rounded-sm shadow-editorial flex items-center justify-center text-[#171717] disabled:opacity-0 disabled:pointer-events-none transition-all cursor-pointer group"
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-5 h-5 text-[#77736C] group-hover:text-[#171717] transition-colors" />
        </button>

        {/* Right Side Turn Hotzone Button (Desktop) */}
        <button
          onClick={handleNext}
          disabled={isAtEnd}
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-16 sm:w-12 sm:h-20 bg-white/80 hover:bg-white border border-[#E8E2D8] rounded-sm shadow-editorial flex items-center justify-center text-[#171717] disabled:opacity-0 disabled:pointer-events-none transition-all cursor-pointer group"
          title="Next Page"
          aria-label="Next Page"
        >
          <ChevronRight className="w-5 h-5 text-[#77736C] group-hover:text-[#171717] transition-colors" />
        </button>

        {/* Scalable & Zoomable Book Canvas Stage */}
        <div
          className="relative w-full h-full flex items-center justify-center transition-transform duration-150 ease-out"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
            transformOrigin: 'center center',
          }}
        >
          <FlipbookStage
            ref={flipbookRef}
            pages={pages}
            initialPage={validInitialPage}
            onPageChange={handlePageChange}
            onOrientationChange={handleOrientationChange}
            onReady={setIsReaderReady}
            isZoomed={zoomLevel > 1}
          />
        </div>
      </main>

      {/* Reader Minimal Bottom Toolbar */}
      <ReaderToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handleJumpToPage}
        isTwoPageSpread={orientation === 'landscape'}
        onToggleSpread={() => {}}
        canSpread={false}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isThumbnailsOpen={false}
        onToggleThumbnails={() => {}}
        isSearchOpen={false}
        onToggleSearch={() => {}}
      />
    </div>
  );
}
