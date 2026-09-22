import { createCanvas, DOMMatrix, Path2D } from '@napi-rs/canvas';
import sharp from 'sharp';
import { createRequire } from 'module';

// Polyfill DOMMatrix and Path2D on globalThis for pdfjs-dist vector graphics support
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = DOMMatrix;
}
if (typeof (globalThis as any).Path2D === 'undefined') {
  (globalThis as any).Path2D = Path2D;
}

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

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
   * Default: 2.0 (Produces ~150-200 DPI for crisp reading on 1080p-4K screens)
   */
  scale?: number;
  /**
   * WebP compression quality for full pages (0-100).
   * Default: 85
   */
  pageQuality?: number;
  /**
   * Max width for page thumbnails in pixels.
   * Default: 320
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

/**
 * Renders every page of a PDF buffer into optimized WebP page images and thumbnails.
 * Aspect ratios (portrait, landscape, square) are preserved exactly without cropping.
 */
export async function renderPdfPages(
  pdfBuffer: Buffer | Uint8Array,
  options: RenderOptions = {}
): Promise<{ totalPages: number; pages: RenderedPage[] }> {
  const {
    scale = 2.0,
    pageQuality = 85,
    thumbnailWidth = 320,
    thumbnailQuality = 80,
    onProgress,
  } = options;

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true,
    disableFontFace: false,
    verbosity: 0,
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

    // Fill white background to ensure opaque pages
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render PDF page onto canvas
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    // Convert canvas to raw PNG buffer
    const rawPngBuffer = canvas.toBuffer('image/png');

    // Convert & optimize to WebP using sharp
    const optimizedWebpBuffer = await sharp(rawPngBuffer)
      .webp({ quality: pageQuality, effort: 4 })
      .toBuffer();

    const imageMetadata = await sharp(optimizedWebpBuffer).metadata();
    const finalWidth = imageMetadata.width || canvasWidth;
    const finalHeight = imageMetadata.height || canvasHeight;

    // Generate thumbnail WebP
    const thumbnailWebpBuffer = await sharp(optimizedWebpBuffer)
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
