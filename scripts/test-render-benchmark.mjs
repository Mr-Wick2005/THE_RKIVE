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

async function benchmark() {
  console.log('--- Benchmarking PDF Rendering Strategies ---');

  // Generate 5-page test PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= 5; i++) {
    const page = pdfDoc.addPage([595, 842]); // A4
    page.drawText(`Page ${i} - High Quality Test Publication`, { x: 50, y: 750, size: 24, font, color: rgb(0.1, 0.2, 0.4) });
    for (let j = 0; j < 20; j++) {
      page.drawText(`Paragraph line ${j}: Academic research and university publications require crisp typography and efficient loading.`, {
        x: 50,
        y: 700 - j * 25,
        size: 10,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);

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

  // Strategy 1: Previous method (PNG buffer + Sharp effort 5)
  console.log('\nTesting Method 1: Previous (PNG buffer -> Sharp effort 5, scale 2.5)');
  let t0 = Date.now();
  for (let p = 1; p <= 5; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 2.5 });
    const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvasFactory }).promise;
    const pngBuf = canvas.toBuffer('image/png');
    const webpBuf = await sharp(pngBuf).webp({ quality: 90, effort: 5, smartSubsample: true }).toBuffer();
    const thumbBuf = await sharp(pngBuf).resize({ width: 360 }).webp({ quality: 82, effort: 4 }).toBuffer();
  }
  let d1 = (Date.now() - t0) / 1000;
  console.log(`Method 1 took: ${d1.toFixed(3)}s (${(d1 / 5).toFixed(3)}s per page)`);

  // Strategy 2: Optimized (Raw pixel buffer / Canvas encode -> Sharp effort 3, scale 2.0)
  console.log('\nTesting Method 2: Optimized (Raw Buffer / Sharp effort 3, scale 2.0)');
  t0 = Date.now();
  for (let p = 1; p <= 5; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 2.0 });
    const width = Math.floor(viewport.width);
    const height = Math.floor(viewport.height);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    await page.render({ canvasContext: ctx, viewport, canvasFactory }).promise;

    // Use raw BGRA/RGBA buffer directly from napi-rs canvas into sharp without PNG intermediate encoding
    const rawData = canvas.data();
    const webpBuf = await sharp(rawData, {
      raw: { width, height, channels: 4 },
    })
      .webp({ quality: 86, effort: 3, smartSubsample: true })
      .toBuffer();

    const thumbBuf = await sharp(rawData, {
      raw: { width, height, channels: 4 },
    })
      .resize({ width: 360, withoutEnlargement: true })
      .webp({ quality: 80, effort: 2 })
      .toBuffer();

    console.log(`  Page ${p}: WebP size = ${(webpBuf.length / 1024).toFixed(1)} KB, Thumb = ${(thumbBuf.length / 1024).toFixed(1)} KB`);
  }
  let d2 = (Date.now() - t0) / 1000;
  console.log(`Method 2 took: ${d2.toFixed(3)}s (${(d2 / 5).toFixed(3)}s per page)`);
  console.log(`Speedup: ${(d1 / d2).toFixed(2)}x faster!`);
}

benchmark().catch(console.error);
