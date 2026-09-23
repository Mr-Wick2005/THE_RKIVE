declare module 'page-flip' {
  export type PageFlipSize = 'fixed' | 'stretch';
  export type PageFlipOrientation = 'portrait' | 'landscape';

  export interface PageFlipSettings {
    startPage?: number;
    size?: PageFlipSize;
    width: number;
    height: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    swipeDistance?: number;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
  }

  export class PageFlip {
    constructor(element: HTMLElement, setting: Partial<PageFlipSettings>);
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    loadFromImages(imagesPaths: string[]): void;
    destroy(): void;
    update(): void;
    turnToPage(pageIndex: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    flipNext(corner?: 'top' | 'bottom'): void;
    flipPrev(corner?: 'top' | 'bottom'): void;
    flip(pageIndex: number, corner?: 'top' | 'bottom'): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): PageFlipOrientation;
    getBoundsRect(): DOMRect;
    on(event: string, app: (e: any) => void): PageFlip;
    off(event: string): PageFlip;
  }
}
