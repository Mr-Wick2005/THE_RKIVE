import { reconcilePublicationAssets } from '../lib/pdf/reconcile.ts';

async function testReconciliation() {
  console.log('--- TEST: ASSET & DATABASE RECONCILIATION ---');

  const mockMagazineId = '00000000-0000-0000-0000-000000000001';
  const mockDeptId = '11111111-1111-1111-1111-111111111111';

  // Mock Supabase client returning 5 expected pages, but missing page 3 in DB and storage
  const mockSupabase = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: mockMagazineId, department_id: mockDeptId, page_count: 5, processing_status: 'COMPLETED' },
            error: null,
          }),
          order: async () => ({
            data: [
              { page_number: 1, image_path: 'page-0001.webp' },
              { page_number: 2, image_path: 'page-0002.webp' },
              // Page 3 missing
              { page_number: 4, image_path: 'page-0004.webp' },
              { page_number: 5, image_path: 'page-0005.webp' },
            ],
            error: null,
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        list: async () => ({
          data: [
            { name: 'page-0001.webp' },
            { name: 'page-0002.webp' },
            // Page 3 missing
            { name: 'page-0004.webp' },
            { name: 'page-0005.webp' },
            { name: 'orphan-artifact.webp' }, // Orphan file
          ],
          error: null,
        }),
      }),
    },
  };

  const report = await reconcilePublicationAssets(mockMagazineId, mockSupabase);
  console.log('Reconciliation Report:', JSON.stringify(report, null, 2));

  if (report.isConsistent) {
    throw new Error('FAIL: Inconsistent publication was marked as consistent!');
  }

  if (!report.missingDbPages.includes(3)) {
    throw new Error('FAIL: Did not detect missing page 3 in DB.');
  }

  if (!report.missingStoragePages.includes('page-0003.webp')) {
    throw new Error('FAIL: Did not detect missing storage page 3.');
  }

  if (report.orphanedStorageFiles.length !== 1 || !report.orphanedStorageFiles[0].includes('orphan-artifact.webp')) {
    throw new Error('FAIL: Did not detect orphaned storage file.');
  }

  console.log('PASS: Asset and database reconciliation verified successfully.\n');
}

testReconciliation().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
