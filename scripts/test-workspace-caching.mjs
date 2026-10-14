import fs from 'fs';
import path from 'path';
import { acquireSourcePdf, releaseSourcePdf, getPdfWorkspaceDir } from '../lib/pdf/workspace.ts';

async function testWorkspaceCaching() {
  console.log('--- TEST: WORKSPACE CACHING & EGRESS ELIMINATION ---');

  const testId = `test-mag-${Date.now()}`;
  const mockStoragePath = `test-dept/${testId}/original.pdf`;

  // Create mock Supabase client that tracks network downloads
  let networkDownloadCount = 0;
  let totalBytesDownloaded = 0;

  // Create a sample 5-page PDF buffer
  const samplePdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n' + 'X'.repeat(50000));

  const mockSupabase = {
    storage: {
      from: (bucket) => ({
        download: async (path) => {
          networkDownloadCount++;
          totalBytesDownloaded += samplePdfBytes.length;
          console.log(`[MOCK_STORAGE] Network download invoked for ${path} (${samplePdfBytes.length} bytes)`);
          return { data: new Blob([samplePdfBytes]), error: null };
        },
      }),
    },
  };

  try {
    // Attempt 1: First download
    console.log('\n[RUN 1] First chunk invocation:');
    const res1 = await acquireSourcePdf(mockSupabase, testId, mockStoragePath);
    console.log(`Run 1 Result: downloaded=${res1.downloaded}, fromCache=${res1.fromCache}, size=${res1.sizeBytes}`);

    if (!res1.downloaded || res1.fromCache) {
      throw new Error('FAIL: Run 1 should have downloaded the file.');
    }

    // Attempt 2: Second chunk invocation on same document
    console.log('\n[RUN 2] Second chunk invocation (subsequent batch):');
    const res2 = await acquireSourcePdf(mockSupabase, testId, mockStoragePath);
    console.log(`Run 2 Result: downloaded=${res2.downloaded}, fromCache=${res2.fromCache}, size=${res2.sizeBytes}`);

    if (res2.downloaded || !res2.fromCache) {
      throw new Error('FAIL: Run 2 should have hit the local workspace cache!');
    }

    // Attempt 3: Third chunk invocation
    console.log('\n[RUN 3] Third chunk invocation:');
    const res3 = await acquireSourcePdf(mockSupabase, testId, mockStoragePath);
    console.log(`Run 3 Result: downloaded=${res3.downloaded}, fromCache=${res3.fromCache}, size=${res3.sizeBytes}`);

    if (res3.downloaded || !res3.fromCache) {
      throw new Error('FAIL: Run 3 should have hit the local workspace cache!');
    }

    console.log('\n=== VERIFICATION SUMMARY ===');
    console.log(`Total chunk invocations: 3`);
    console.log(`Network downloads performed: ${networkDownloadCount}`);
    console.log(`Total bytes downloaded: ${totalBytesDownloaded} bytes`);
    console.log(`Bytes saved across batches 2 & 3: ${samplePdfBytes.length * 2} bytes (66.7% bandwidth reduction)`);

    if (networkDownloadCount !== 1) {
      throw new Error(`FAIL: Expected exactly 1 network download, but got ${networkDownloadCount}`);
    }

    // Cleanup
    releaseSourcePdf(testId);
    const workspaceDir = getPdfWorkspaceDir();
    const filePath = path.join(workspaceDir, `${testId}.pdf`);
    if (fs.existsSync(filePath)) {
      throw new Error('FAIL: Release did not clean up the temporary workspace file.');
    }

    console.log('PASS: Workspace caching and release verified successfully!\n');
  } finally {
    releaseSourcePdf(testId);
  }
}

testWorkspaceCaching().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
