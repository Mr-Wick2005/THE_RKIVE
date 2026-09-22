'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { MagazineWithRelations, MagazinePage } from '@/types/magazine';
import { ReaderHeader } from '@/components/reader/reader-header';
import { ReaderToolbar } from '@/components/reader/reader-toolbar';
import { ThumbnailDrawer } from '@/components/reader/thumbnail-drawer';
import { ReaderSearchDrawer } from '@/components/reader/reader-search-drawer';
import { ChevronLeft, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';

interface DigitalMagazineReaderProps {
  magazine: MagazineWithRelations;
  initialPages: MagazinePage[];
}

export function DigitalMagazineReader({
  magazine,
  initialPages,
}: DigitalMagazineReaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If initialPages is empty (e.g., demo fallback), generate placeholder page items based on cover
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

  const [currentPage, setCurrentPage] = useState<number>(validInitialPage);
  const [isTwoPageSpread, setIsTwoPageSpread] = useState<boolean>(true);
  const [canSpread, setCanSpread] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [pageTurnAnimation, setPageTurnAnimation] = useState<'next' | 'prev' | null>(null);

  // Touch gesture state
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive check for 2-page spread capability
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      setCanSpread(isDesktop);
      if (!isDesktop) {
        setIsTwoPageSpread(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update URL parameter when page changes without full page reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('page', String(currentPage));
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentPage]);

  // Preload adjacent page images
  useEffect(() => {
    const pagesToPreload = [
      currentPage - 2,
      currentPage - 1,
      currentPage + 1,
      currentPage + 2,
      currentPage + 3,
    ].filter((p) => p >= 1 && p <= totalPages);

    pagesToPreload.forEach((pageNum) => {
      const pageData = pages.find((p) => p.page_number === pageNum);
      if (pageData?.image_path) {
        const img = new window.Image();
        img.src = pageData.image_path;
      }
    });
  }, [currentPage, pages, totalPages]);

  // Navigation handlers
  const goToPage = useCallback(
    (targetPage: number) => {
      const clamped = Math.max(1, Math.min(totalPages, targetPage));
      if (clamped === currentPage) return;

      setPageTurnAnimation(clamped > currentPage ? 'next' : 'prev');
      setCurrentPage(clamped);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });

      setTimeout(() => {
        setPageTurnAnimation(null);
      }, 350);
    },
    [currentPage, totalPages]
  );

  const handleNext = useCallback(() => {
    if (isTwoPageSpread) {
      if (currentPage === 1) {
        goToPage(2);
      } else {
        goToPage(currentPage + 2);
      }
    } else {
      goToPage(currentPage + 1);
    }
  }, [currentPage, isTwoPageSpread, goToPage]);

  const handlePrev = useCallback(() => {
    if (isTwoPageSpread) {
      if (currentPage <= 2) {
        goToPage(1);
      } else {
        goToPage(currentPage - 2);
      }
    } else {
      goToPage(currentPage - 1);
    }
  }, [currentPage, isTwoPageSpread, goToPage]);

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
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(totalPages);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isThumbnailsOpen) setIsThumbnailsOpen(false);
          if (isSearchOpen) setIsSearchOpen(false);
          if (zoomLevel > 1) {
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, goToPage, totalPages, isThumbnailsOpen, isSearchOpen, zoomLevel]);

  // Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoomLevel > 1) return; // Don't swipe turn while zoomed in
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null || zoomLevel > 1) {
      return;
    }

    const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
    const diffY = touchStartYRef.current - e.changedTouches[0].clientY;

    // Minimum swipe threshold of 50px and horizontal angle check
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.5, +(prev + 0.25).toFixed(2)));
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

  // Fullscreen API toggle
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

  // Listen for native fullscreen changes
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
        // User cancelled or share failed
      }
    } else {
      navigator.clipboard?.writeText(currentUrl);
      alert('Publication URL copied to clipboard!');
    }
  };

  // Compute pages to render based on layout
  // When isTwoPageSpread:
  // - If currentPage is 1 (Cover): render only Cover (centered / single page)
  // - If currentPage > 1:
  //   - Left page: even page number (e.g. 2, 4, 6...) -> if currentPage is odd (3), left is currentPage - 1
  //   - Right page: left + 1 (e.g. 3, 5, 7...)
  const isCover = currentPage === 1;
  const leftPageNum = isTwoPageSpread
    ? isCover
      ? null
      : currentPage % 2 === 0
      ? currentPage
      : currentPage - 1
    : currentPage;

  const rightPageNum = isTwoPageSpread
    ? isCover
      ? null
      : (leftPageNum ? leftPageNum + 1 : null)
    : null;

  const leftPageData = leftPageNum ? pages.find((p) => p.page_number === leftPageNum) : null;
  const rightPageData = rightPageNum && rightPageNum <= totalPages ? pages.find((p) => p.page_number === rightPageNum) : null;
  const singlePageData = pages.find((p) => p.page_number === currentPage);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-[#F4EFE6] text-[#171717] select-none flex flex-col overflow-hidden z-30"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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

      {/* Main Reader Stage / Flipbook Canvas */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 pt-16 pb-20 relative overflow-hidden">
        {/* Previous Page Click Hotzone (Desktop) */}
        <button
          onClick={handlePrev}
          disabled={currentPage <= 1}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-16 sm:w-12 sm:h-24 bg-white/70 hover:bg-white/95 border border-[#E8E2D8] rounded-sm shadow-md flex items-center justify-center text-[#171717] disabled:opacity-0 disabled:pointer-events-none transition-all"
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Next Page Click Hotzone (Desktop) */}
        <button
          onClick={handleNext}
          disabled={
            isTwoPageSpread
              ? (currentPage === 1 ? 2 > totalPages : currentPage + 2 > totalPages)
              : currentPage >= totalPages
          }
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-16 sm:w-12 sm:h-24 bg-white/70 hover:bg-white/95 border border-[#E8E2D8] rounded-sm shadow-md flex items-center justify-center text-[#171717] disabled:opacity-0 disabled:pointer-events-none transition-all"
          title="Next Page"
          aria-label="Next Page"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Book Container with Transform Matrix (Zoom & Pan & Transition) */}
        <div
          className={`relative max-h-[82vh] transition-transform duration-200 ease-out flex items-center justify-center ${
            pageTurnAnimation === 'next' ? 'animate-in slide-in-from-right-2 duration-300' : ''
          } ${pageTurnAnimation === 'prev' ? 'animate-in slide-in-from-left-2 duration-300' : ''}`}
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
            transformOrigin: 'center center',
          }}
        >
          {/* TWO-PAGE SPREAD VIEW (Desktop & non-cover) */}
          {isTwoPageSpread && !isCover ? (
            <div className="flex items-center shadow-2xl rounded-xs overflow-hidden border border-[#DCD5C9] bg-white">
              {/* Left Page */}
              <div className="relative w-[40vw] max-w-[540px] aspect-[1/1.414] bg-white border-r border-[#EFECE6] overflow-hidden group">
                {leftPageData ? (
                  <Image
                    src={leftPageData.image_path}
                    alt={`Page ${leftPageData.page_number}`}
                    fill
                    priority
                    className="object-contain"
                    sizes="(max-width: 1200px) 40vw, 540px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#F8F6F1] text-xs font-mono text-[#77736C]">
                    Blank Page
                  </div>
                )}
                {/* Left Page Spine Inner Shadow */}
                <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />
                {leftPageData && (
                  <span className="absolute bottom-2 left-4 text-[10px] font-mono text-[#77736C] bg-white/80 px-1.5 py-0.5 rounded-xs">
                    {leftPageData.page_number}
                  </span>
                )}
              </div>

              {/* Right Page */}
              <div className="relative w-[40vw] max-w-[540px] aspect-[1/1.414] bg-white overflow-hidden group">
                {rightPageData ? (
                  <Image
                    src={rightPageData.image_path}
                    alt={`Page ${rightPageData.page_number}`}
                    fill
                    priority
                    className="object-contain"
                    sizes="(max-width: 1200px) 40vw, 540px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#F8F6F1] text-xs font-mono text-[#77736C]">
                    End of Publication
                  </div>
                )}
                {/* Right Page Spine Inner Shadow */}
                <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />
                {rightPageData && (
                  <span className="absolute bottom-2 right-4 text-[10px] font-mono text-[#77736C] bg-white/80 px-1.5 py-0.5 rounded-xs">
                    {rightPageData.page_number}
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* SINGLE PAGE VIEW (Mobile / Cover / Single Mode) */
            <div className="relative w-[85vw] max-w-[580px] aspect-[1/1.414] bg-white rounded-xs overflow-hidden shadow-2xl border border-[#DCD5C9] group">
              {singlePageData ? (
                <Image
                  src={singlePageData.image_path}
                  alt={`Page ${singlePageData.page_number}`}
                  fill
                  priority
                  className="object-contain"
                  sizes="(max-width: 768px) 85vw, 580px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#F8F6F1] text-xs font-mono text-[#77736C]">
                  Page not found
                </div>
              )}
              {/* Subtle Page Edge Gradient */}
              <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/5 to-transparent pointer-events-none" />
              {singlePageData && (
                <span className="absolute bottom-2 right-4 text-[10px] font-mono text-[#77736C] bg-white/80 px-1.5 py-0.5 rounded-xs">
                  {singlePageData.page_number}
                </span>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Toolbar */}
      <ReaderToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        isTwoPageSpread={isTwoPageSpread}
        onToggleSpread={() => setIsTwoPageSpread((prev) => !prev)}
        canSpread={canSpread}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isThumbnailsOpen={isThumbnailsOpen}
        onToggleThumbnails={() => setIsThumbnailsOpen((prev) => !prev)}
        isSearchOpen={isSearchOpen}
        onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
      />

      {/* Page Thumbnails Drawer */}
      <ThumbnailDrawer
        isOpen={isThumbnailsOpen}
        onClose={() => setIsThumbnailsOpen(false)}
        pages={pages}
        currentPage={currentPage}
        onSelectPage={goToPage}
      />

      {/* In-Magazine Search & Index Drawer */}
      <ReaderSearchDrawer
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        pages={pages}
        onSelectPage={goToPage}
      />
    </div>
  );
}
