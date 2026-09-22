import { PDFDocument } from 'pdf-lib';

export interface PdfValidationResult {
  isValid: boolean;
  error?: string;
  pageCount: number;
  title?: string;
  author?: string;
}

export const MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Validates a PDF buffer by checking:
 * 1. File size limits
 * 2. Magic header bytes (%PDF-)
 * 3. Structural validity and readable pages via pdf-lib
 * 4. Exact page count extraction
 */
export async function validatePdfBuffer(
  buffer: Buffer | Uint8Array
): Promise<PdfValidationResult> {
  try {
    // 1. Minimum size check
    if (!buffer || buffer.length < 100) {
      return {
        isValid: false,
        error: 'The uploaded file is empty or too small to be a valid PDF document.',
        pageCount: 0,
      };
    }

    // 2. Maximum size check (100MB)
    if (buffer.length > MAX_PDF_SIZE_BYTES) {
      return {
        isValid: false,
        error: 'This PDF exceeds the maximum allowed file size of 100 MB.',
        pageCount: 0,
      };
    }

    // 3. Magic bytes check: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    const header = Buffer.from(buffer.slice(0, 5)).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      return {
        isValid: false,
        error: 'Invalid file format: File header does not match the standard PDF specification.',
        pageCount: 0,
      };
    }

    // 4. Parse structural integrity with pdf-lib
    const pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
    });

    const pageCount = pdfDoc.getPageCount();
    if (pageCount <= 0) {
      return {
        isValid: false,
        error: 'The PDF document contains no readable pages.',
        pageCount: 0,
      };
    }

    const title = pdfDoc.getTitle();
    const author = pdfDoc.getAuthor();

    return {
      isValid: true,
      pageCount,
      title: title || undefined,
      author: author || undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown validation error';
    return {
      isValid: false,
      error: `Failed to validate PDF: ${message.includes('encrypt') ? 'Encrypted/password-protected PDFs are not supported.' : 'Corrupted or unreadable PDF document.'}`,
      pageCount: 0,
    };
  }
}
