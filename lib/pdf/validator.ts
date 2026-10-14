import { PDFDocument } from 'pdf-lib';
import { STORAGE_LIMITS } from '../config/upload-limits';

export interface PdfValidationResult {
  isValid: boolean;
  error?: string;
  errorType?: 'PERMANENT' | 'TRANSIENT';
  pageCount: number;
  title?: string;
  author?: string;
}

export const MAX_PDF_SIZE_BYTES = STORAGE_LIMITS.MAX_PDF_SIZE_BYTES;

/**
 * Validates a PDF buffer by checking:
 * 1. File size limits (centralized up to 100MB)
 * 2. Magic header bytes (%PDF-)
 * 3. Structural validity and readable pages via pdf-lib
 * 4. Safe upper page count limit
 * 5. Error classification (PERMANENT vs TRANSIENT)
 */
export async function validatePdfBuffer(
  buffer: Buffer | Uint8Array
): Promise<PdfValidationResult> {
  try {
    // 1. Minimum size check
    if (!buffer || buffer.length < STORAGE_LIMITS.MIN_PDF_SIZE_BYTES) {
      return {
        isValid: false,
        errorType: 'PERMANENT',
        error: 'The uploaded file is empty or too small to be a valid PDF document.',
        pageCount: 0,
      };
    }

    // 2. Maximum size check (100MB configured limit)
    if (buffer.length > STORAGE_LIMITS.MAX_PDF_SIZE_BYTES) {
      const maxMb = (STORAGE_LIMITS.MAX_PDF_SIZE_BYTES / (1024 * 1024)).toFixed(0);
      return {
        isValid: false,
        errorType: 'PERMANENT',
        error: `This PDF exceeds the maximum allowed file size of ${maxMb} MB.`,
        pageCount: 0,
      };
    }

    // 3. Magic bytes check: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    const header = Buffer.from(buffer.slice(0, 5)).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      return {
        isValid: false,
        errorType: 'PERMANENT',
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
        errorType: 'PERMANENT',
        error: 'The PDF document contains no readable pages.',
        pageCount: 0,
      };
    }

    if (pageCount > STORAGE_LIMITS.MAX_PDF_PAGE_COUNT) {
      return {
        isValid: false,
        errorType: 'PERMANENT',
        error: `Document exceeds the maximum operational limit of ${STORAGE_LIMITS.MAX_PDF_PAGE_COUNT} pages (found ${pageCount} pages).`,
        pageCount,
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
    const isEncrypted = message.includes('encrypt') || message.includes('password');
    return {
      isValid: false,
      errorType: 'PERMANENT',
      error: `Failed to validate PDF: ${isEncrypted ? 'Encrypted or password-protected PDFs are not supported.' : 'Corrupted or unreadable PDF document structure.'}`,
      pageCount: 0,
    };
  }
}

