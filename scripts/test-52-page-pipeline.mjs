import fs from 'fs';
import path from 'path';
import { createCanvas, DOMMatrix, Path2D } from '@napi-rs/canvas';
import sharp from 'sharp';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = DOMMatrix;
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = Path2D;
}

async function test52Pages() {
  console.log('--- Generating and Processing 52-Page Test PDF ---');
  const tStart = Date.now();

  // 1. Generate 52-page PDF in memory
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  console.log('Creating 52-page PDF document...');
  for (let i = 1; i <= 52; i++) {
    const page = pdfDoc.addPage([595, 842]);
    page.drawText(`THE RKIVE - ISSUE #4 (PAGE ${i} OF 52)`, {
      x: 50,
      y: 780,
      size: 18,
      font,
      color: rgb(0.1, 0.15, 0.3),
    });
    for (let j = 0; j < 15; j++) {
      page.drawText(
        `Section ${j + 1}: High-performance digital magazine flipbook rendering engine with chunked progress and instant resumption.`,
        { x: 50, y: 730 - j * 30, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) }
      );
    }
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  console.log(`Generated 52-page PDF size: ${(pdfBuffer.length / 1024).toFixed(1)} KB in ${((Date.now() - tStart) / 1000).toFixed(2)}s`);

  // 2. Load PDF with PDF.js
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
  const pdfjsLib = pdfjs.default || pdfjs;
  const rootDir = process.cwd();
  const cMapUrl = path.join(rootDir, 'node_modules', 'pdfjs-dist', 'cmaps').replace(/\\/g, '/') + '/';
  const standardFontDataUrl = path.join(rootDir, 'node_modules', 'pdfjs-dist', 'standard_fonts').replace(/\\/g, '/') + '/';

  class NapiCanvasFactory {
    create(width, height) {
      const canvas = createCanvas(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
      const context = canvas.getContext('2d');
      return { canvas, context };
    }
    reset(canvasAndContext, width, height) {
      if (canvasAndContext.canvas) {
        canvasAndContext.canvas.width = Math.max(1, Math.floor(width));
        canvasAndContext.canvas.height = Math.max(1, Math.floor(height));
      }
    }
    destroy(canvasAndContext) {
      if (canvasAndContext.canvas) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
      }
    }
    _createCanvas(width, height) {
      return createCanvas(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
    }
  }

  const canvasFactory = new NapiCanvasFactory();

  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
    canvasFactory,
  }).promise;

  const totalPages = doc.numPages;
  console.log(`PDF parsed: ${totalPages} pages. Starting single-page streaming rendering...`);

  const tRenderStart = Date.now();
  let totalWebpBytes = 0;

  for (let p = 1; p <= totalPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 2.0 });
    const width = Math.floor(viewport.width);
    const height = Math.floor(viewport.height);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvasFactory,
    }).promise;

    const rawData = canvas.data();
    const webpBuffer = await sharp(rawData, {
      raw: { width, height, channels: 4 },
    })
      .webp({ quality: 86, effort: 3, smartSubsample: true })
      .toBuffer();

    const thumbBuffer = await sharp(rawData, {
      raw: { width, height, channels: 4 },
    })
      .resize({ width: 360, withoutEnlargement: true })
      .webp({ quality: 80, effort: 2 })
      .toBuffer();

    totalWebpBytes += webpBuffer.length + thumbBuffer.length;

    // Cleanup page
    page.cleanup();

    if (p % 10 === 0 || p === totalPages) {
      const elapsed = ((Date.now() - tRenderStart) / 1000).toFixed(2);
      const avgPerPg = (((Date.now() - tRenderStart) / p) / 1000).toFixed(3);
      console.log(`Rendered page ${p}/${totalPages} in ${elapsed}s (avg ${avgPerPg}s/page)`);
    }
  }

  const totalRenderSec = ((Date.now() - tRenderStart) / 1000).toFixed(2);
  console.log(`\n=== 52-PAGE TEST RESULT ===`);
  console.log(`Total Pages: 52`);
  console.log(`Total Render Time: ${totalRenderSec}s`);
  console.log(`Average Per Page: ${(totalRenderSec / 52).toFixed(3)}s/page`);
  console.log(`Total WebP & Thumbnails Output Size: ${(totalWebpBytes / 1024).toFixed(1)} KB`);
  console.log(`Memory Usage RSS: ${(process.memoryUsage().rss / (1024 * 1024)).toFixed(1)} MB`);
}

test52Pages().catch(console.error);
