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
  // Ensure trailing path separator for PDF.js URL resolution
  const cMapUrl = path.join(rootDir, 'node_modules', 'pdfjs-dist', 'cmaps') + path.sep;
  const standardFontDataUrl =
    path.join(rootDir, 'node_modules', 'pdfjs-dist', 'standard_fonts') + path.sep;
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
   * Default: 3.0 (Produces ~216 DPI print-quality rendering for crisp text on Retina/4K screens)
   */
  scale?: number;
  /**
   * WebP compression quality for full pages (0-100).
   * Default: 92 (Visually lossless high-fidelity rendering)
   */
  pageQuality?: number;
  /**
   * Max width for page thumbnails in pixels.
   * Default: 360
   */
  thumbnailWidth?: number;
  /**
   * WebP compression quality for thumbnails (0-100).
   * Default: 85
   */
  thumbnailQuality?: number;
  /**
   * Optional progress callback for observability
   */
  onProgress?: (currentPage: number, totalPages: number) => void;
}

/**
 * Renders every page of a PDF buffer into high-resolution, print-quality WebP images and thumbnails.
 * Fonts, vector graphics, transparency, and layout are preserved with exact fidelity using Path2D vector glyphs.
 */
export async function renderPdfPages(
  pdfBuffer: Buffer | Uint8Array,
  options: RenderOptions = {}
): Promise<{ totalPages: number; pages: RenderedPage[] }> {
  const {
    scale = 3.0,
    pageQuality = 92,
    thumbnailWidth = 360,
    thumbnailQuality = 85,
    onProgress,
  } = options;

  const pdfjsLib = await getPdfJs();
  const canvasFactory = new NapiCanvasFactory();
  const { cMapUrl, standardFontDataUrl } = getPdfJsResourcePaths();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    useSystemFonts: true,
    disableFontFace: true, // Enables vector Path2D glyph rendering in server-side Canvas
    verbosity: 0,
    canvasFactory: canvasFactory,
  });

  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const pages: RenderedPage[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvasWidth = Math.floor(viewport.width);
    const canvasHeight = Math.floor(viewport.height);

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Fill clean white background to ensure opaque publication surface
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render PDF page onto canvas
    const renderContext = {
      canvasContext: ctx as any,
      viewport: viewport,
      canvasFactory: canvasFactory,
    };

    await page.render(renderContext).promise;

    // Convert canvas to raw PNG buffer
    const rawPngBuffer = canvas.toBuffer('image/png');

    // Convert & optimize to high-fidelity WebP using Sharp
    const optimizedWebpBuffer = await sharp(rawPngBuffer)
      .webp({
        quality: pageQuality,
        effort: 5,
        smartSubsample: true,
        reductionEffort: 5,
      })
      .toBuffer();

    const imageMetadata = await sharp(optimizedWebpBuffer).metadata();
    const finalWidth = imageMetadata.width || canvasWidth;
    const finalHeight = imageMetadata.height || canvasHeight;

    // Generate separate thumbnail WebP
    const thumbnailWebpBuffer = await sharp(rawPngBuffer)
      .resize({ width: thumbnailWidth, withoutEnlargement: true })
      .webp({ quality: thumbnailQuality, effort: 4 })
      .toBuffer();

    pages.push({
      pageNumber: pageNum,
      imageBuffer: optimizedWebpBuffer,
      thumbnailBuffer: thumbnailWebpBuffer,
      width: finalWidth,
      height: finalHeight,
      fileSize: optimizedWebpBuffer.length,
      thumbnailFileSize: thumbnailWebpBuffer.length,
      mimeType: 'image/webp',
    });

    if (onProgress) {
      onProgress(pageNum, totalPages);
    }
  }

  return { totalPages, pages };
}
