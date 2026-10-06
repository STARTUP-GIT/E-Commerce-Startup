'use client';

import React, { useCallback, useRef, useState } from 'react';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Upload, X, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface UploadResult {
  url: string;
  publicId: string;
}

interface ImageUploadFieldProps {
  /** Current value — Cloudinary secure URL (or empty) */
  value?: string;
  /** Cloudinary folder to upload into, e.g. "banners" or "branding" */
  folder: string;
  /** Label shown above the uploader */
  label?: string;
  /** Optional hint text below the label */
  hint?: string;
  /** Called when a new image is successfully uploaded */
  onChange: (result: UploadResult) => void;
  /** Called when the current image is removed (clears value) */
  onRemove?: () => void;
  /** Max size in bytes (default 5 MB) */
  maxBytes?: number;
  /** Whether the field is disabled */
  disabled?: boolean;
}

const DEFAULT_MAX = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function ImageUploadField({
  value,
  folder,
  label,
  hint,
  onChange,
  onRemove,
  maxBytes = DEFAULT_MAX,
  disabled = false,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      setError(null);

      // Client-side validation
      if (!ACCEPTED.includes(file.type)) {
        setError('Please upload a JPG, PNG, or WEBP image.');
        return;
      }
      if (file.size > maxBytes) {
        const mb = Math.round(maxBytes / 1024 / 1024);
        setError(`Image must be smaller than ${mb} MB.`);
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);

        const res = await axiosInstance.post<{ data?: UploadResult }>('/api/storage/image', formData);
        const data = res.data?.data;

        if (!data?.url) throw new Error('No URL returned from upload service.');

        onChange({ url: data.url, publicId: data.publicId || '' });
      } catch {
        setError('Unable to upload image. Please try again.');
      } finally {
        setUploading(false);
      }
    },
    [folder, maxBytes, onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    // Reset so same file can be re-selected after a failed upload
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const triggerPicker = () => {
    if (!disabled && !uploading) inputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    onRemove?.();
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
          {label}
        </label>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      {value ? (
        /* Preview state */
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="relative w-full" style={{ aspectRatio: '16/7', maxHeight: 160 }}>
            <img
              src={value}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Overlay on uploading */}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 border-t border-white/[0.06]">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-3 text-[11px]"
              onClick={triggerPicker}
              disabled={disabled || uploading}
            >
              <RefreshCw className="h-3 w-3 mr-1.5" /> Replace
            </Button>
            {onRemove && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-3 text-[11px] text-red-400 hover:bg-red-500/10"
                onClick={handleRemove}
                disabled={disabled || uploading}
              >
                <X className="h-3 w-3 mr-1.5" /> Remove
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Drop-zone / picker */
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => e.key === 'Enter' && triggerPicker()}
          onClick={triggerPicker}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={[
            'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all cursor-pointer py-8',
            dragOver
              ? 'border-white/40 bg-white/[0.06]'
              : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
            (disabled || uploading) ? 'pointer-events-none opacity-50' : '',
          ].join(' ')}
        >
          {uploading ? (
            <RefreshCw className="h-7 w-7 text-white/40 animate-spin" />
          ) : (
            <Upload className="h-7 w-7 text-white/30" />
          )}
          <div className="text-center px-4">
            <p className="text-xs font-semibold text-white/50">
              {uploading ? 'Uploading…' : 'Click or drag & drop to upload'}
            </p>
            <p className="text-[10px] text-white/25 mt-1">JPG, PNG, WEBP · max {Math.round(maxBytes / 1024 / 1024)} MB</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1.5 text-[11px] text-red-400">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}

      {hint && !error && (
        <p className="text-[10px] text-white/30">{hint}</p>
      )}
    </div>
  );
}
