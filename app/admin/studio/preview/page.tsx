'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Sparkles } from 'lucide-react';
import { useAdminAuth } from '@/components/admin/admin-auth-context';
import { CmsStudioData } from '@/types/cms';
import { InteractivePreview } from '@/components/admin/studio/preview/interactive-preview';

export default function StandaloneDraftPreviewPage() {
  const { profile, token, isLoading } = useAdminAuth();
  const [studioData, setStudioData] = useState<CmsStudioData | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/cms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'get-data' }),
    })
      .then((res) => res.json())
      .then((data) => setStudioData(data))
      .catch(console.error);
  }, [token]);

  if (isLoading || !studioData) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center font-mono text-xs text-[#55524D]">
        Loading Draft Preview...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#EAE3D7]">
      {/* Top Banner Notice */}
      <div className="bg-[#1A1A1A] text-[#FAF7F2] px-6 py-2.5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/studio"
            className="hover:underline flex items-center gap-1.5 text-[#FAF7F2]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Studio</span>
          </Link>
          <span>|</span>
          <span className="text-[#B58A55] font-bold">
            PREVIEWING DRAFT (v{studioData.version + 1} Candidate)
          </span>
        </div>

        <Link
          href="/admin/studio"
          className="px-3 py-1 bg-[#1B44B8] text-white hover:bg-[#133596] font-bold uppercase text-[11px]"
        >
          Open Studio to Publish
        </Link>
      </div>

      <div className="flex-1">
        <InteractivePreview
          config={studioData.draft}
          studioData={studioData}
          previewMode={previewMode}
          onChangePreviewMode={setPreviewMode}
        />
      </div>
    </div>
  );
}
