'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { validateCoverFile } from '@/lib/storage/upload';
import { cn } from '@/lib/utils';

interface CoverUploaderProps {
  currentCoverUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  error?: string | null;
}

export function CoverUploader({
  currentCoverUrl,
  onFileSelect,
  error: externalError,
}: CoverUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentCoverUrl || null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const validation = validateCoverFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid cover image.');
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
    onFileSelect(file);

    // Create local object URL for preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl(null);
    setValidationError(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const activeError = validationError || externalError;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#44423E]">
          Publication Cover Artwork
        </label>
        <span className="text-[10px] font-mono text-[#77736C]">
          JPG, PNG, WEBP (Max 10 MB)
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        name="cover_file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Upload Box / Preview Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-sm p-6 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[220px]',
          isDragging
            ? 'border-[#171717] bg-[#F0EBE1]'
            : 'border-[#E8E2D8] bg-[#F8F6F1]/50 hover:bg-[#F0EBE1]/40 hover:border-[#DCD5C9]',
          activeError && 'border-rose-300 bg-rose-50/20'
        )}
      >
        {previewUrl ? (
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full max-w-md">
            {/* Aspect Ratio 3:4 Preview Container */}
            <div className="relative w-32 aspect-magazine rounded-sm overflow-hidden shadow-magazine border border-[#171717]/10 flex-shrink-0 bg-white">
              <Image
                src={previewUrl}
                alt="Selected Cover Preview"
                fill
                className="object-cover"
              />
              <div className="absolute inset-y-0 left-0 w-3 magazine-spine-edge pointer-events-none" />
            </div>

            {/* Selected File Details */}
            <div className="space-y-2 text-left flex-1 min-w-0">
              <div className="flex items-center gap-2 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {selectedFile ? 'Ready to Upload' : 'Current Cover'}
                </span>
              </div>

              {selectedFile ? (
                <div>
                  <p className="text-xs font-mono text-[#171717] truncate font-medium">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] font-mono text-[#77736C]">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#77736C]">
                  Click to replace current cover artwork
                </p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#171717] hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 hover:underline"
                >
                  <X className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2 py-4">
            <div className="w-10 h-10 rounded-full bg-white border border-[#E8E2D8] flex items-center justify-center mx-auto text-[#77736C] shadow-sm">
              <Upload className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-[#171717]">
                Click to browse or drag & drop cover image
              </p>
              <p className="text-[11px] text-[#77736C]">
                Recommended 3:4 portrait ratio (e.g. 1200 × 1600 px)
              </p>
            </div>
          </div>
        )}
      </div>

      {activeError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
}
