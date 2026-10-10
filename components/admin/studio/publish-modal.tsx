'use client';

import React, { useState } from 'react';
import { Send, X, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { LandingPageConfig } from '@/types/cms';
import { validateAndSanitizeConfig, generateChangeSummary } from '@/lib/cms/validation';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftConfig: LandingPageConfig;
  publishedConfig: LandingPageConfig;
  currentVersion: number;
  onConfirmPublish: (note: string) => Promise<void>;
  isPublishing: boolean;
}

export function PublishModal({
  isOpen,
  onClose,
  draftConfig,
  publishedConfig,
  currentVersion,
  onConfirmPublish,
  isPublishing,
}: PublishModalProps) {
  const [releaseNote, setReleaseNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const { sanitized, result } = validateAndSanitizeConfig(draftConfig);
  const changeSummary = generateChangeSummary(publishedConfig, sanitized);
  const nextVersion = currentVersion + 1;

  const handlePublish = async () => {
    if (!result.isValid) {
      setErrorMsg(`Cannot publish with validation issues: ${result.issues.map(i => i.message).join('; ')}`);
      return;
    }
    setErrorMsg(null);
    try {
      await onConfirmPublish(releaseNote || `Release v${nextVersion}`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to publish');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl border-2 border-[#1A1A1A] bg-[#FAF8F3] shadow-[8px_8px_0px_#1A1A1A] overflow-hidden">
        {/* Masthead */}
        <div className="bg-[#1A1A1A] text-[#FAF7F2] p-4 flex items-center justify-between border-b-2 border-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#C24A26]" />
            <span className="font-serif text-base font-bold">
              Publish Landing Page to Live
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#FAF7F2]/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border-2 border-rose-600 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-4 border-2 border-[#1A1A1A] bg-[#F4EFEB]">
            <div>
              <div className="font-mono text-xs font-bold uppercase text-[#55524D]">
                Version Transition
              </div>
              <div className="font-serif text-lg font-bold text-[#1A1A1A] mt-0.5">
                v{currentVersion} → <span className="text-[#1B44B8]">v{nextVersion}</span>
              </div>
            </div>

            <div className="text-right text-xs font-mono">
              <span className="inline-flex items-center gap-1 text-[#2B6E3F] font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Validation Clean
              </span>
            </div>
          </div>

          {/* Change Summary */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Detected Section Updates
            </label>
            <div className="flex flex-wrap gap-1.5 p-3 border-2 border-[#1A1A1A] bg-[#FAF7F2] max-h-32 overflow-y-auto">
              {changeSummary.map((item, idx) => (
                <span
                  key={idx}
                  className="text-xs font-mono font-semibold px-2 py-1 bg-[#1A1A1A] text-[#FAF7F2]"
                >
                  ✓ {item}
                </span>
              ))}
            </div>
          </div>

          {/* Release Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold uppercase text-[#1A1A1A]">
              Release Audit Note (Optional)
            </label>
            <input
              type="text"
              value={releaseNote}
              onChange={(e) => setReleaseNote(e.target.value)}
              placeholder={`e.g. Updated Hero Section & Featured Publications`}
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-white text-xs font-medium focus:outline-none"
            />
          </div>

          <p className="text-[11px] text-[#55524D] leading-relaxed">
            Publishing will immediately render this configuration on the public homepage (`/`) and record a new immutable snapshot in version history.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F4EFEB] border-t-2 border-[#1A1A1A] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            className="px-4 py-2 border-2 border-[#1A1A1A] bg-white hover:bg-gray-100 text-xs font-bold font-mono uppercase cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || !result.isValid}
            className="px-5 py-2 border-2 border-[#1A1A1A] bg-[#1B44B8] text-[#FAF7F2] hover:bg-[#133596] text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[3px_3px_0px_#1A1A1A] cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isPublishing ? 'Publishing...' : 'Confirm & Publish'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
