'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Save,
  Send,
  Eye,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  ExternalLink,
  Laptop,
  Tablet,
  Smartphone,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StudioHeaderProps {
  version: number;
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  lastSavedAt?: string;
  publishedAt?: string;
  previewMode: 'desktop' | 'tablet' | 'mobile';
  showPreviewPane: boolean;
  onTogglePreviewPane: () => void;
  onChangePreviewMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  onSaveDraft: () => void;
  onOpenPublishModal: () => void;
  onResetDefaults: () => void;
}

export function StudioHeader({
  version,
  isDirty,
  isSaving,
  isPublishing,
  lastSavedAt,
  publishedAt,
  previewMode,
  showPreviewPane,
  onTogglePreviewPane,
  onChangePreviewMode,
  onSaveDraft,
  onOpenPublishModal,
  onResetDefaults,
}: StudioHeaderProps) {
  return (
    <div className="bg-[#FAF8F3] border-b-2 border-[#1A1A1A] sticky top-0 z-30 shadow-xs">
      {/* Top Academic Sub-bar */}
      <div className="border-b border-[#1A1A1A]/10 px-6 py-1 flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-[#55524D]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="hover:text-[#1A1A1A] flex items-center gap-1 font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Executive Desk</span>
          </Link>
          <span>/</span>
          <span className="text-[#1A1A1A] font-bold">Homepage Studio & CMS</span>
        </div>

        <div className="flex items-center gap-4">
          {publishedAt && (
            <div className="flex items-center gap-1.5 text-[10px]">
              <Clock className="w-3 h-3 text-[#1B44B8]" />
              <span>Live Version v{version} published</span>
            </div>
          )}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#1B44B8] flex items-center gap-1 transition-colors"
          >
            <span>View Live Site</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Studio Action Bar */}
      <div className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Studio Identity & Save Status */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] flex items-center justify-center font-serif text-lg font-bold shadow-[2px_2px_0px_#1B44B8]">
            S
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#1A1A1A] leading-tight">
                Landing Page Studio
              </h1>
              <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 bg-[#1B44B8] text-[#FAF7F2] border border-[#1A1A1A]">
                v{version}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs">
              {isDirty ? (
                <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#C24A26] bg-[#C24A26]/10 px-2 py-0.5 border border-[#C24A26]/30">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unsaved Draft Changes
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-mono text-[#2B6E3F]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Draft Synced {lastSavedAt ? `(${new Date(lastSavedAt).toLocaleTimeString()})` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Responsive Device Preview Switchers (when preview pane is open) */}
        {showPreviewPane && (
          <div className="hidden lg:flex items-center bg-[#F4EFEB] p-1 border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1A1A1A]">
            <button
              type="button"
              onClick={() => onChangePreviewMode('desktop')}
              className={cn(
                'px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1.5 transition-all',
                previewMode === 'desktop'
                  ? 'bg-[#1A1A1A] text-[#FAF7F2]'
                  : 'text-[#55524D] hover:text-[#1A1A1A]'
              )}
              title="Desktop Preview (Full width)"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>

            <button
              type="button"
              onClick={() => onChangePreviewMode('tablet')}
              className={cn(
                'px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1.5 transition-all',
                previewMode === 'tablet'
                  ? 'bg-[#1A1A1A] text-[#FAF7F2]'
                  : 'text-[#55524D] hover:text-[#1A1A1A]'
              )}
              title="Tablet Preview (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet</span>
            </button>

            <button
              type="button"
              onClick={() => onChangePreviewMode('mobile')}
              className={cn(
                'px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1.5 transition-all',
                previewMode === 'mobile'
                  ? 'bg-[#1A1A1A] text-[#FAF7F2]'
                  : 'text-[#55524D] hover:text-[#1A1A1A]'
              )}
              title="Mobile Preview (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>
        )}

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Toggle Live Preview Pane */}
          <button
            type="button"
            onClick={onTogglePreviewPane}
            className={cn(
              'px-3.5 py-2 border-2 border-[#1A1A1A] text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#1A1A1A]',
              showPreviewPane
                ? 'bg-[#1A1A1A] text-[#FAF7F2]'
                : 'bg-[#F4EFEB] text-[#1A1A1A] hover:bg-[#EAE3D7]'
            )}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">
              {showPreviewPane ? 'Hide Preview' : 'Split Preview'}
            </span>
          </button>

          {/* Save Draft Button */}
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="px-4 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-[#1A1A1A] hover:bg-[#FAF7F2] text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#1A1A1A] disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4 text-[#1B44B8]" />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          {/* Publish Button */}
          <button
            type="button"
            onClick={onOpenPublishModal}
            disabled={isPublishing}
            className="px-5 py-2 border-2 border-[#1A1A1A] bg-[#1B44B8] text-[#FAF7F2] hover:bg-[#133596] text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[5px_5px_0px_#C24A26] disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4 text-[#FAF7F2]" />
            <span>{isPublishing ? 'Publishing...' : 'Publish to Live'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
