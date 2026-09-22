'use client';

import React, { useState, useRef } from 'react';
import { FileText, Upload, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { validatePdfFile } from '@/lib/storage/upload';
import { cn } from '@/lib/utils';

interface PdfUploaderProps {
  currentPdfUrl?: string | null;
  onFileSelect: (file: File | null) => void;
  error?: string | null;
}

export function PdfUploader({
  currentPdfUrl,
  onFileSelect,
  error: externalError,
}: PdfUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid PDF file.');
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
    onFileSelect(file);
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
    setValidationError(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const activeError = validationError || externalError;
  const hasFile = Boolean(selectedFile || currentPdfUrl);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[#44423E]">
          Publication Document (Original PDF)
        </label>
        <span className="text-[10px] font-mono text-[#77736C]">
          PDF format only (Max 100 MB)
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        name="pdf_file"
        accept="application/pdf,.pdf"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Upload Box / Info Container */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-sm p-6 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[140px]',
          isDragging
            ? 'border-[#171717] bg-[#F0EBE1]'
            : 'border-[#E8E2D8] bg-[#F8F6F1]/50 hover:bg-[#F0EBE1]/40 hover:border-[#DCD5C9]',
          activeError && 'border-rose-300 bg-rose-50/20'
        )}
      >
        {hasFile ? (
          <div className="flex items-center justify-between gap-4 w-full max-w-lg bg-white p-4 rounded-sm border border-[#E8E2D8] shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-sm bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{selectedFile ? 'PDF Attached & Validated' : 'Current PDF on File'}</span>
                </div>
                <p className="text-xs font-mono text-[#171717] truncate font-medium mt-0.5">
                  {selectedFile ? selectedFile.name : 'original-publication.pdf'}
                </p>
                {selectedFile && (
                  <p className="text-[10px] font-mono text-[#77736C]">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-sm hover:bg-[#F0EBE1] text-[#77736C] hover:text-[#171717]"
                title="Replace PDF"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded-sm hover:bg-rose-50 text-rose-700"
                title="Remove PDF"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-white border border-[#E8E2D8] flex items-center justify-center mx-auto text-[#77736C] shadow-sm">
              <Upload className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-[#171717]">
                Click to browse or drag & drop publication PDF
              </p>
              <p className="text-[11px] text-[#77736C]">
                Restricted college archive storage • Max 100 MB
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
