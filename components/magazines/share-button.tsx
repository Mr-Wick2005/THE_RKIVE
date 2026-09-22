'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareButtonProps {
  title: string;
}

export function ShareButton({ title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof window !== 'undefined') {
      try {
        if (navigator.share) {
          await navigator.share({
            title: `${title} | Athenaeum College Archive`,
            url: window.location.href,
          });
        } else {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      } catch (err) {
        // Fallback clipboard write
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch {
          console.warn('Share copy failed');
        }
      }
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="md"
      onClick={handleShare}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-emerald-600" />
          <span className="text-emerald-700">Link Copied</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4 text-[#77736C]" />
          <span>Share Publication</span>
        </>
      )}
    </Button>
  );
}
