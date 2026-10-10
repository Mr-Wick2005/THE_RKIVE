'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Upload,
  Image as ImageIcon,
  Film,
  Copy,
  Check,
  Trash2,
  Filter,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { CmsMediaAsset } from '@/types/cms';
import { cn } from '@/lib/utils';

interface MediaLibraryPanelProps {
  media: CmsMediaAsset[];
  onUploadAsset: (file: File, sectionTag: string, altText: string) => Promise<boolean>;
  onDeleteAsset: (mediaId: string) => Promise<boolean>;
  onSelectAssetUrl?: (url: string) => void;
  isModalPicker?: boolean;
}

export function MediaLibraryPanel({
  media,
  onUploadAsset,
  onDeleteAsset,
  onSelectAssetUrl,
  isModalPicker = false,
}: MediaLibraryPanelProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadSectionTag, setUploadSectionTag] = useState('general');
  const [altTextInput, setAltTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const ok = await onUploadAsset(file, uploadSectionTag, altTextInput || file.name);
      if (ok && fileInputRef.current) {
        fileInputRef.current.value = '';
        setAltTextInput('');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const copyUrlToClipboard = (asset: CmsMediaAsset) => {
    navigator.clipboard.writeText(asset.public_url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMedia = media.filter((m) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'images') return m.mime_type.startsWith('image/');
    if (selectedFilter === 'videos') return m.mime_type.startsWith('video/');
    return m.section_tag === selectedFilter;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      {!isModalPicker && (
        <div className="border-b-2 border-[#1A1A1A] pb-4">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C24A26] block">
            Archival Assets
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
            Media Asset Library
          </h2>
          <p className="text-xs text-[#55524D] mt-1">
            Upload, preview, and organize high-resolution images, logos, and loop reel videos for the landing page.
          </p>
        </div>
      )}

      {/* Upload Zone Card */}
      <div className="border-2 border-[#1A1A1A] bg-[#FAF7F2] p-6 shadow-[3px_3px_0px_#1A1A1A] space-y-4">
        <h3 className="font-serif text-base font-bold text-[#1A1A1A] pb-2 border-b border-[#1A1A1A]/20 flex items-center justify-between">
          <span>Upload New Asset</span>
          <span className="text-[11px] font-mono text-[#77736C]">
            Images max 10MB • Videos max 50MB
          </span>
        </h3>

        {uploadError && (
          <div className="p-3 bg-rose-50 border-2 border-rose-600 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase text-[#1A1A1A] mb-1">
              Section Tag
            </label>
            <select
              value={uploadSectionTag}
              onChange={(e) => setUploadSectionTag(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-semibold"
            >
              <option value="general">General Asset</option>
              <option value="branding">Logo & Branding</option>
              <option value="hero">Hero Artwork</option>
              <option value="archive_reel">Archive Video Loop</option>
              <option value="about">About Artwork</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold uppercase text-[#1A1A1A] mb-1">
              Alt Text / Description (Optional)
            </label>
            <input
              type="text"
              value={altTextInput}
              onChange={(e) => setAltTextInput(e.target.value)}
              placeholder="e.g. THE RKIVE Editorial Painting"
              className="w-full px-3 py-2 border-2 border-[#1A1A1A] bg-[#F4EFEB] text-xs font-medium"
            />
          </div>
        </div>

        {/* Drag & Drop Upload Container */}
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed border-[#1A1A1A] p-6 text-center cursor-pointer transition-all bg-[#F4EFEB] hover:bg-white',
            isUploading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,video/mp4"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-10 h-10 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FAF7F2] flex items-center justify-center mx-auto mb-2 shadow-[2px_2px_0px_#1B44B8]">
            <Upload className="w-5 h-5" />
          </div>

          <div className="font-bold text-xs text-[#1A1A1A]">
            {isUploading ? 'Uploading asset...' : 'Click to select or drop image / video file'}
          </div>
          <p className="text-[11px] font-mono text-[#77736C] mt-1">
            Supported formats: JPG, PNG, WEBP, SVG, MP4
          </p>
        </div>
      </div>

      {/* Asset Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1A1A1A]/20 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'images', label: 'Images' },
            { id: 'videos', label: 'Videos' },
            { id: 'hero', label: 'Hero' },
            { id: 'branding', label: 'Logos' },
            { id: 'about', label: 'About' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              className={cn(
                'px-3 py-1 text-xs font-mono font-bold transition-all cursor-pointer',
                selectedFilter === tab.id
                  ? 'bg-[#1A1A1A] text-[#FAF7F2] border-2 border-[#1A1A1A] shadow-[2px_2px_0px_#1B44B8]'
                  : 'bg-[#F4EFEB] text-[#1A1A1A] border-2 border-[#1A1A1A]/30 hover:border-[#1A1A1A]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs font-mono text-[#55524D]">
          {filteredMedia.length} assets
        </span>
      </div>

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <div className="border-2 border-dashed border-[#1A1A1A]/30 p-12 text-center bg-[#FAF7F2] text-xs font-mono text-[#77736C]">
          No media assets found in this filter category. Upload assets above to build your library.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredMedia.map((asset) => {
            const isVideo = asset.mime_type.startsWith('video/');
            const isCopied = copiedId === asset.id;

            return (
              <div
                key={asset.id}
                className="border-2 border-[#1A1A1A] bg-[#FAF7F2] flex flex-col justify-between shadow-[3px_3px_0px_#1A1A1A] overflow-hidden group"
              >
                {/* Thumbnail Preview Box */}
                <div className="relative aspect-video bg-[#EAE3D7] border-b-2 border-[#1A1A1A] overflow-hidden flex items-center justify-center">
                  {isVideo ? (
                    <div className="w-full h-full bg-black flex items-center justify-center text-white relative">
                      <video
                        src={asset.public_url}
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Film className="w-8 h-8 text-white drop-shadow-md" />
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={asset.public_url}
                      alt={asset.alt_text || asset.file_name}
                      fill
                      className="object-contain p-2"
                    />
                  )}

                  <span className="absolute top-2 right-2 text-[9px] font-mono font-bold uppercase bg-[#1A1A1A] text-[#FAF7F2] px-1.5 py-0.5">
                    {asset.section_tag || 'general'}
                  </span>
                </div>

                {/* Metadata & Actions */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-xs text-[#1A1A1A] truncate" title={asset.file_name}>
                      {asset.file_name}
                    </div>
                    <div className="text-[10px] font-mono text-[#77736C] mt-0.5">
                      {formatFileSize(asset.file_size)} • {new Date(asset.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1A1A1A]/10 flex items-center justify-between gap-2">
                    {onSelectAssetUrl ? (
                      <button
                        type="button"
                        onClick={() => onSelectAssetUrl(asset.public_url)}
                        className="flex-1 py-1.5 px-2 bg-[#1B44B8] text-[#FAF7F2] text-xs font-bold font-mono hover:bg-[#133596] transition-all cursor-pointer text-center"
                      >
                        Use in Section
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => copyUrlToClipboard(asset)}
                        className="flex-1 py-1.5 px-2 border border-[#1A1A1A] bg-white hover:bg-[#EAE3D7] text-xs font-mono font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#2B6E3F]" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteAsset(asset.id)}
                      className="p-1.5 border border-[#1A1A1A] bg-white hover:bg-rose-100 text-rose-700 cursor-pointer"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
