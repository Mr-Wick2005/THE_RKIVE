import path from 'path';
import { createCanvas, DOMMatrix, Path2D } from '@napi-rs/canvas';
import sharp from 'sharp';

// Polyfill DOMMatrix and Path2D on globalThis for pdfjs-dist vector graphics support
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = DOMMatrix;
}
if (typeof (globalThis as any).Path2D === 'undefined') {
  (globalThis as any).Path2D = Path2D;
}

function getPdfJsResourcePaths() {
  const rootDir = process.cwd();
  // Ensure normalized forward-slash URL format with trailing slash for PDF.js font/cMap loader
  const cMapUrl = path.join(rootDir, 'node_modules', 'pdfjs-dist', 'cmaps').replace(/\\/g, '/') + '/';
  const standardFontDataUrl =
    path.join(rootDir, 'node_modules', 'pdfjs-dist', 'standard_fonts').replace(/\\/g, '/') + '/';
  return { cMapUrl, standardFontDataUrl };
}

async function getPdfJs() {
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = DOMMatrix;
  }
  if (typeof (globalThis as any).Path2D === 'undefined') {
    (globalThis as any).Path2D = Path2D;
  }
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
  return (pdfjs.default || pdfjs) as any;
}

class NapiCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
    const context = canvas.getContext('2d');
    return {
      canvas,
      context,
    };
  }

  reset(canvasAndContext: { canvas: any; context: any }, width: number, height: number) {
    if (canvasAndContext.canvas) {
      canvasAndContext.canvas.width = Math.max(1, Math.floor(width));
      canvasAndContext.canvas.height = Math.max(1, Math.floor(height));
    }
  }

  destroy(canvasAndContext: { canvas: any; context: any }) {
    if (canvasAndContext.canvas) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
      canvasAndContext.canvas = null;
      canvasAndContext.context = null;
    }
  }

  _createCanvas(width: number, height: number) {
    return createCanvas(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
  }
}

export interface RenderedPage {
  pageNumber: number; // 1-indexed
  imageBuffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
  fileSize: number;
  thumbnailFileSize: number;
  mimeType: 'image/webp';
}

export interface RenderOptions {
  /**
   * Scale factor for rasterization.
   * Default: 2.0 (Produces ~150-180 DPI high-DPI rendering, sharp text without 4K bloat)
   */
  scale?: number;
  /**
   * WebP compression quality for full pages (0-100).
   * Default: 86 (Visually lossless, fast compression)
   */
  pageQuality?: number;
  /**
   * WebP compression effort (0-6).
   * Default: 3 (Optimal balance: ~3x faster than effort 5 with negligible size difference)
   */
  pageEffort?: number;
  /**
   * Max width for page thumbnails in pixels.
   * Default: 360
   */
  thumbnailWidth?: number;
  /**
   * WebP compression quality for thumbnails (0-100).
   * Default: 80
   */
  thumbnailQuality?: number;
  /**
   * Optional progress callback for observability
   */
  onProgress?: (currentPage: number, totalPages: number) => void;
}

export interface LoadedPdfDoc {
  pdfDoc: any;
  totalPages: number;
  canvasFactory: NapiCanvasFactory;
}

/**
 * Loads a PDF document buffer into memory using PDF.js
 */
export async function loadPdfDocument(
  pdfBuffer: Buffer | Uint8Array
): Promise<LoadedPdfDoc> {
  const pdfjsLib = await getPdfJs();
  const canvasFactory = new NapiCanvasFactory();
  const { cMapUrl, standardFontDataUrl } = getPdfJsResourcePaths();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
    canvasFactory: canvasFactory,
  });

  const pdfDoc = await loadingTask.promise;
  return {
    pdfDoc,
    totalPages: pdfDoc.numPages,
    canvasFactory,
  };
}

/**
 * Renders a single PDF page to high-quality WebP and thumbnail without retaining canvas memory
 */
export async function renderSinglePdfPage(
  pdfDoc: any,
  pageNum: number,
  canvasFactory: NapiCanvasFactory,
  options: RenderOptions = {}
): Promise<RenderedPage> {
  const {
    scale = 2.0,
    pageQuality = 86,
    pageEffort = 3,
    thumbnailWidth = 360,
    thumbnailQuality = 80,
  } = options;

  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const width = Math.floor(viewport.width);
  const height = Math.floor(viewport.height);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill clean white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const renderContext = {
    canvasContext: ctx as any,
    viewport: viewport,
    canvasFactory: canvasFactory,
  };

  await page.render(renderContext).promise;

  // Extract raw pixel buffer directly from napi-rs canvas (bypasses PNG encoding overhead)
  const rawData = canvas.data();

  // Convert & optimize to high-fidelity WebP using Sharp directly from raw BGRA/RGBA pixels
  const optimizedWebpBuffer = await sharp(rawData, {
    raw: { width, height, channels: 4 },
  })
    .webp({
      quality: pageQuality,
      effort: pageEffort,
      smartSubsample: true,
    })
    .toBuffer();

  // Generate separate thumbnail WebP
  const thumbnailWebpBuffer = await sharp(rawData, {
    raw: { width, height, channels: 4 },
  })
    .resize({ width: thumbnailWidth, withoutEnlargement: true })
    .webp({ quality: thumbnailQuality, effort: 2 })
    .toBuffer();

  // Explicitly cleanup page resources in PDF.js
  if (typeof page.cleanup === 'function') {
    page.cleanup();
  }

  return {
    pageNumber: pageNum,
    imageBuffer: optimizedWebpBuffer,
    thumbnailBuffer: thumbnailWebpBuffer,
    width,
    height,
    fileSize: optimizedWebpBuffer.length,
    thumbnailFileSize: thumbnailWebpBuffer.length,
    mimeType: 'image/webp',
  };
}

/**
 * Renders all or specified pages of a PDF buffer sequentially into high-resolution WebP images.
 */
export async function renderPdfPages(
  pdfBuffer: Buffer | Uint8Array,
  options: RenderOptions = {}
): Promise<{ totalPages: number; pages: RenderedPage[] }> {
  const { onProgress, ...renderOpts } = options;
  const { pdfDoc, totalPages, canvasFactory } = await loadPdfDocument(pdfBuffer);
  const pages: RenderedPage[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const rendered = await renderSinglePdfPage(pdfDoc, pageNum, canvasFactory, renderOpts);
    pages.push(rendered);

    if (onProgress) {
      onProgress(pageNum, totalPages);
    }
  }

  return { totalPages, pages };
}
