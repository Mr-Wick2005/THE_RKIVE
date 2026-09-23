'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { PageFlip } from 'page-flip';
import { MagazinePage } from '@/types/magazine';

export interface FlipbookStageRef {
  flipNext: () => void;
  flipPrev: () => void;
  goToPage: (pageNum: number, animate?: boolean) => void;
  getCurrentPage: () => number;
  getOrientation: () => 'portrait' | 'landscape';
  isReady: () => boolean;
}

interface FlipbookStageProps {
  pages: MagazinePage[];
  initialPage: number;
  onPageChange: (pageNumber: number) => void;
  onOrientationChange?: (orientation: 'portrait' | 'landscape') => void;
  onReady?: (isReady: boolean) => void;
  isZoomed?: boolean;
}

function createPageDomElement(page: MagazinePage, index: number, total: number): HTMLElement {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const isHard = isFirst || isLast;
  const isOdd = (index + 1) % 2 === 1;

  const pageEl = document.createElement('div');
  pageEl.className = `flip-page-item ${isFirst ? 'flip-page-cover-front' : ''} ${isLast ? 'flip-page-cover-back' : ''}`;
  pageEl.dataset.density = isHard ? 'hard' : 'soft';

  const innerEl = document.createElement('div');
  innerEl.className = 'flip-page-inner relative w-full h-full bg-white overflow-hidden shadow-sm';

  // Page Image
  const imgEl = document.createElement('img');
  imgEl.src = page.image_path;
  imgEl.alt = `Page ${page.page_number}`;
  imgEl.loading = index < 4 ? 'eager' : 'lazy';
  imgEl.decoding = 'async';
  imgEl.draggable = false;
  imgEl.className = 'w-full h-full object-contain pointer-events-none select-none';
  innerEl.appendChild(imgEl);

  // Center Book Spine Shadow Overlay for Inner Pages
  if (!isHard) {
    const spineShadow = document.createElement('div');
    spineShadow.className = `absolute inset-y-0 ${
      isOdd ? 'right-0 w-12 bg-gradient-to-l' : 'left-0 w-12 bg-gradient-to-r'
    } from-black/15 via-black/5 to-transparent pointer-events-none z-10`;
    innerEl.appendChild(spineShadow);

    // Page Number Badge on Inner Pages
    const badgeContainer = document.createElement('div');
    badgeContainer.className = `absolute bottom-2.5 ${
      isOdd ? 'right-4' : 'left-4'
    } z-20 pointer-events-none`;
    const badgeSpan = document.createElement('span');
    badgeSpan.className =
      'text-[9px] font-mono text-[#77736C] bg-white/80 backdrop-blur-xs px-1.5 py-0.5 rounded-xs border border-[#E8E2D8]/60 shadow-2xs';
    badgeSpan.textContent = String(page.page_number);
    badgeContainer.appendChild(badgeSpan);
    innerEl.appendChild(badgeContainer);
  } else {
    // Subtle Spine Hinge for Hard Covers
    const hinge = document.createElement('div');
    hinge.className = `absolute inset-y-0 ${
      isFirst ? 'left-0 w-4 bg-gradient-to-r' : 'right-0 w-4 bg-gradient-to-l'
    } from-black/20 via-black/5 to-transparent pointer-events-none z-10`;
    innerEl.appendChild(hinge);
  }

  pageEl.appendChild(innerEl);
  return pageEl;
}

export const FlipbookStage = forwardRef<FlipbookStageRef, FlipbookStageProps>(function FlipbookStage(
  { pages, initialPage, onPageChange, onOrientationChange, onReady, isZoomed = false },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const isEngineReadyRef = useRef<boolean>(false);
  const [isReady, setIsReady] = useState(false);
  const [hasInitError, setHasInitError] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [fallbackPage, setFallbackPage] = useState(initialPage);

  // Determine base aspect ratio from pages if available
  const samplePage = pages[0];
  const pageWidth = samplePage?.width || 1200;
  const pageHeight = samplePage?.height || 1700;
  const aspectRatio = pageWidth / pageHeight;

  // Base dimensions for PageFlip (A4 standard: 550x778 or tailored to aspect ratio)
  const baseWidth = 550;
  const baseHeight = Math.round(baseWidth / (aspectRatio || 0.707));

  // Expose imperative methods to parent only when the engine is truly ready
  useImperativeHandle(ref, () => ({
    flipNext: () => {
      if (!isEngineReadyRef.current || !pageFlipRef.current) return;
      try {
        pageFlipRef.current.flipNext('top');
      } catch (err) {
        console.warn('PageFlip flipNext ignored during transition:', err);
      }
    },
    flipPrev: () => {
      if (!isEngineReadyRef.current || !pageFlipRef.current) return;
      try {
        pageFlipRef.current.flipPrev('top');
      } catch (err) {
        console.warn('PageFlip flipPrev ignored during transition:', err);
      }
    },
    goToPage: (pageNum: number, animate = true) => {
      if (!isEngineReadyRef.current || !pageFlipRef.current) return;
      const targetIndex = Math.max(0, Math.min(pages.length - 1, pageNum - 1));
      try {
        if (animate) {
          pageFlipRef.current.flip(targetIndex);
        } else {
          pageFlipRef.current.turnToPage(targetIndex);
        }
      } catch (err) {
        console.warn('PageFlip goToPage ignored during transition:', err);
      }
    },
    getCurrentPage: () => {
      if (isEngineReadyRef.current && pageFlipRef.current) {
        try {
          const idx = pageFlipRef.current.getCurrentPageIndex();
          if (typeof idx === 'number' && !isNaN(idx)) {
            return idx + 1;
          }
        } catch {
          // fallback
        }
      }
      return initialPage;
    },
    getOrientation: () => {
      if (isEngineReadyRef.current && pageFlipRef.current) {
        try {
          return (pageFlipRef.current.getOrientation() as 'portrait' | 'landscape') || 'landscape';
        } catch {
          // fallback
        }
      }
      return 'landscape';
    },
    isReady: () => isEngineReadyRef.current,
  }));

  // Initialize PageFlip engine
  useEffect(() => {
    if (!containerRef.current || pages.length === 0) return;

    let isSubscribed = true;
    isEngineReadyRef.current = false;
    setIsReady(false);
    onReady?.(false);
    setHasInitError(false);

    // Create a dedicated host element inside containerRef to prevent DOM removal bugs on destroy
    const hostEl = document.createElement('div');
    hostEl.className =
      'flipbook-stage w-full h-full max-w-6xl max-h-[85vh] flex items-center justify-center';
    containerRef.current.appendChild(hostEl);

    // Build DOM elements for each page
    const pageDomElements: HTMLElement[] = pages.map((p, idx) =>
      createPageDomElement(p, idx, pages.length)
    );

    // Start index (0-indexed)
    const startIndex = Math.max(0, Math.min(pages.length - 1, initialPage - 1));

    try {
      const pageFlip = new PageFlip(hostEl, {
        width: baseWidth,
        height: baseHeight,
        size: 'stretch',
        minWidth: 260,
        maxWidth: 900,
        minHeight: 370,
        maxHeight: 1280,
        maxShadowOpacity: 0.45,
        showCover: true,
        usePortrait: true,
        flippingTime: 700,
        useMouseEvents: !isZoomed,
        mobileScrollSupport: false,
        swipeDistance: 25,
        clickEventForward: true,
        startPage: startIndex,
        drawShadow: true,
      });

      pageFlip.loadFromHTML(pageDomElements);

      pageFlip.on('init', (e: any) => {
        if (!isSubscribed) return;
        pageFlipRef.current = pageFlip;
        isEngineReadyRef.current = true;
        setIsReady(true);
        onReady?.(true);

        const currentOri = pageFlip.getOrientation() as 'portrait' | 'landscape';
        setOrientation(currentOri);
        onOrientationChange?.(currentOri);
      });

      pageFlip.on('flip', (e: any) => {
        if (!isSubscribed) return;
        try {
          const pageIdx =
            typeof e.data === 'number' ? e.data : pageFlip.getCurrentPageIndex();
          const pNum = pageIdx + 1;
          setFallbackPage(pNum);
          onPageChange(pNum);
        } catch {
          // Transition guard
        }
      });

      pageFlip.on('changeOrientation', (e: any) => {
        if (!isSubscribed) return;
        const newOri =
          (e.data as 'portrait' | 'landscape') || pageFlip.getOrientation();
        setOrientation(newOri);
        onOrientationChange?.(newOri);
      });

      const handleResize = () => {
        if (isEngineReadyRef.current && pageFlipRef.current) {
          try {
            pageFlipRef.current.update();
          } catch {
            // Resize guard
          }
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        isSubscribed = false;
        isEngineReadyRef.current = false;
        setIsReady(false);
        onReady?.(false);
        window.removeEventListener('resize', handleResize);

        try {
          pageFlip.destroy();
        } catch {
          // Cleanup guard
        }
        pageFlipRef.current = null;

        if (hostEl.parentNode) {
          hostEl.parentNode.removeChild(hostEl);
        }
      };
    } catch (err) {
      console.error('Failed to initialize PageFlip engine:', err);
      setHasInitError(true);
      isEngineReadyRef.current = false;
      setIsReady(false);
      onReady?.(false);
    }
  }, [pages, baseWidth, baseHeight, isZoomed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preload adjacent high-res images around current page
  useEffect(() => {
    if (!pages || pages.length === 0) return;

    let activeIndex = Math.max(0, Math.min(pages.length - 1, initialPage - 1));
    if (isReady && isEngineReadyRef.current && pageFlipRef.current) {
      try {
        const pageIdx = pageFlipRef.current.getCurrentPageIndex();
        if (typeof pageIdx === 'number' && !isNaN(pageIdx)) {
          activeIndex = pageIdx;
        }
      } catch {
        // Safe fallback
      }
    }

    const indicesToPreload = [
      activeIndex - 2,
      activeIndex - 1,
      activeIndex,
      activeIndex + 1,
      activeIndex + 2,
      activeIndex + 3,
    ].filter((idx) => idx >= 0 && idx < pages.length);

    indicesToPreload.forEach((idx) => {
      const page = pages[idx];
      if (page?.image_path) {
        const img = new Image();
        img.src = page.image_path;
      }
    });
  }, [isReady, initialPage, pages]);

  const currentPageObj = pages[fallbackPage - 1] || pages[0];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center select-none overflow-hidden"
    >
      {/* Loading Skeleton while engine initializes */}
      {!isReady && !hasInitError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#F8F6F1]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-[#171717] text-[#F8F6F1] flex items-center justify-center font-serif text-lg font-semibold animate-pulse shadow-md">
              M
            </div>
            <p className="text-xs font-mono text-[#77736C] tracking-wide">
              Loading Physical Edition...
            </p>
          </div>
        </div>
      )}

      {/* Fallback readable view if WebGL/Canvas initialization encountered an error */}
      {hasInitError && currentPageObj && (
        <div className="w-full h-full max-w-4xl max-h-[85vh] flex items-center justify-center p-4">
          <div className="relative bg-white shadow-editorial border border-[#E8E2D8] rounded-sm overflow-hidden max-h-full flex items-center justify-center">
            <img
              src={currentPageObj.image_path}
              alt={`Page ${currentPageObj.page_number}`}
              className="max-h-[80vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
});
