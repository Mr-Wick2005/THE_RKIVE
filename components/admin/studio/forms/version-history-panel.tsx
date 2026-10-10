'use client';

import React, { useState } from 'react';
import { History, RotateCcw, CheckCircle2, Clock, ArrowRight, AlertTriangle } from 'lucide-react';
import { CmsVersionSnapshot } from '@/types/cms';

interface VersionHistoryPanelProps {
  versions: CmsVersionSnapshot[];
  currentVersion: number;
  onRestoreVersion: (versionNumber: number) => void;
  onResetDefaults: () => void;
}

export function VersionHistoryPanel({
  versions,
  currentVersion,
  onRestoreVersion,
  onResetDefaults,
}: VersionHistoryPanelProps) {
  const [confirmRestoreVersion, setConfirmRestoreVersion] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Section Header */}
      <div className="border-b-2 border-[#1A1A1A] pb-4 flex items-center justify-between">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
            Audit Trail & Rollback
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
            Version History & Snapshots
          </h2>
          <p className="text-xs text-[#55524D] mt-1">
            Review the immutable audit log of published homepage versions and restore any previous release with one click.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="px-3 py-1.5 border-2 border-rose-700 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-mono font-bold flex items-center gap-1.5 shadow-[2px_2px_0px_#1A1A1A] cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Defaults</span>
        </button>
      </div>

      {/* Confirmation Modal for Reset to Defaults */}
      {showResetConfirm && (
        <div className="p-4 border-2 border-rose-600 bg-rose-50 space-y-3">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>Confirm Reset to Factory Defaults</span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed">
            This will replace your current draft with the original THE RKIVE factory homepage configuration. Your current published version will remain active until you publish again.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onResetDefaults();
                setShowResetConfirm(false);
              }}
              className="px-4 py-1.5 bg-rose-700 text-white text-xs font-bold font-mono hover:bg-rose-800 cursor-pointer"
            >
              Confirm Reset
            </button>
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-1.5 border border-[#1A1A1A] bg-white text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Restore Version */}
      {confirmRestoreVersion !== null && (
        <div className="p-4 border-2 border-[#1B44B8] bg-[#1B44B8]/10 space-y-3">
          <div className="flex items-center gap-2 text-[#1B44B8] font-bold text-xs">
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Confirm Rollback to Version {confirmRestoreVersion}</span>
          </div>
          <p className="text-xs text-[#1A1A1A] leading-relaxed">
            This will immediately restore and publish the full configuration snapshot from Version {confirmRestoreVersion} to the live homepage.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onRestoreVersion(confirmRestoreVersion);
                setConfirmRestoreVersion(null);
              }}
              className="px-4 py-1.5 bg-[#1B44B8] text-white text-xs font-bold font-mono hover:bg-[#133596] cursor-pointer"
            >
              Restore & Publish Version {confirmRestoreVersion}
            </button>
            <button
              type="button"
              onClick={() => setConfirmRestoreVersion(null)}
              className="px-4 py-1.5 border border-[#1A1A1A] bg-white text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline of Versions */}
      {versions.length === 0 ? (
        <div className="border-2 border-dashed border-[#1A1A1A]/30 p-12 text-center bg-[#FAF7F2] text-xs font-mono text-[#77736C]">
          No recorded publish history yet. The live website is running on the baseline configuration (v{currentVersion}).
        </div>
      ) : (
        <div className="space-y-4">
          {versions.map((ver) => {
            const isCurrent = ver.version_number === currentVersion;
            return (
              <div
                key={ver.id || ver.version_number}
                className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-5 shadow-[3px_3px_0px_#1A1A1A] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1A1A1A]/20">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold px-2.5 py-0.5 bg-[#1A1A1A] text-[#FAF7F2] border border-[#1A1A1A]">
                      v{ver.version_number}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-[#1A1A1A]">
                        {ver.note || `Release v${ver.version_number}`}
                      </div>
                      <div className="text-[11px] font-mono text-[#77736C]">
                        Published {new Date(ver.published_at).toLocaleString()} by{' '}
                        <span className="text-[#1A1A1A] font-semibold">
                          {ver.published_by_name || 'Super Admin'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#2B6E3F] bg-[#2B6E3F]/10 px-3 py-1 border border-[#2B6E3F]/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Currently Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRestoreVersion(ver.version_number)}
                        className="px-3 py-1.5 border-2 border-[#1A1A1A] bg-[#F4EFEB] hover:bg-[#1B44B8] hover:text-[#FAF7F2] text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#1A1A1A] cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore This Version</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Change Summary Badges */}
                {Array.isArray(ver.change_summary) && ver.change_summary.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-mono uppercase text-[#77736C] mr-1">
                      Modified:
                    </span>
                    {ver.change_summary.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-[#F4EFEB] text-[#1A1A1A] border border-[#1A1A1A]/30"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
