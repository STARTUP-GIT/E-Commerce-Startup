"use client";

import React, { useCallback, useRef, useState } from 'react';
import axiosInstance from '@/lib/axios/axiosInstance';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Plus
} from 'lucide-react';
import { Button } from './Button';

export interface UploadedAsset {
  url: string;
  name: string;
  size?: number;
  publicId?: string;
  type?: string;
}

interface MultiFileUploadFieldProps {
  /** Array of uploaded URLs */
  value: string[];
  /** Callback when the list of URLs changes */
  onChange: (urls: string[]) => void;
  /** Cloudinary folder to upload into, e.g. "evidence", "policies", "postmortems", "reports" */
  folder?: string;
  /** Label shown above the uploader */
  label?: string;
  /** Helper text */
  hint?: string;
  /** Max file size in bytes (default 10 MB) */
  maxBytes?: number;
  /** Max number of files allowed (default 10) */
  maxFiles?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to allow pasting external URLs */
  allowExternalUrls?: boolean;
  /** Accepted file types: "images", "documents", or "all" (default "all") */
  acceptedTypes?: 'images' | 'documents' | 'all';
}

const DEFAULT_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
const DEFAULT_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function MultiFileUploadField({
  value = [],
  onChange,
  folder = 'evidence',
  label,
  hint,
  maxBytes = 10 * 1024 * 1024, // 10 MB
  maxFiles = 10,
  disabled = false,
  allowExternalUrls = true,
  acceptedTypes = 'all',
}: MultiFileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showManualUrlInput, setShowManualUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  const acceptString =
    acceptedTypes === 'images'
      ? 'image/jpeg,image/jpg,image/png,image/webp,image/avif'
      : acceptedTypes === 'documents'
      ? '.pdf,.doc,.docx'
      : 'image/jpeg,image/jpg,image/png,image/webp,image/avif,.pdf,.doc,.docx';

  const isImageFile = (urlOrType: string) => {
    return (
      urlOrType.includes('image/') ||
      /\.(jpg|jpeg|png|webp|avif|gif)(\?.*)?$/i.test(urlOrType)
    );
  };

  const uploadSingleFile = async (file: File): Promise<string> => {
    // Determine whether to use image or document endpoint
    const isDoc = DEFAULT_DOC_TYPES.includes(file.type) || /\.(pdf|doc|docx)$/i.test(file.name);
    const endpoint = isDoc ? '/api/storage/document' : '/api/storage/image';
    const fileField = isDoc ? 'document' : 'image';

    const formData = new FormData();
    formData.append(fileField, file);
    formData.append('folder', folder);

    const res = await axiosInstance.post<{ data?: { url: string; publicId?: string } }>(
      endpoint,
      formData
    );
    const uploadedUrl = res.data?.data?.url;
    if (!uploadedUrl) {
      throw new Error('Upload succeeded but no secure URL was returned from Cloudinary.');
    }
    return uploadedUrl;
  };

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError(null);
      const filesToUpload = Array.from(fileList);

      if (filesToUpload.length === 0) return;

      if (value.length + filesToUpload.length > maxFiles) {
        setError(`You can upload at most ${maxFiles} files.`);
        return;
      }

      // Validate sizes
      for (const f of filesToUpload) {
        if (f.size > maxBytes) {
          const mb = Math.round(maxBytes / 1024 / 1024);
          setError(`"${f.name}" exceeds the maximum size limit of ${mb} MB.`);
          return;
        }
      }

      setUploading(true);
      const newUrls: string[] = [];
      let failureCount = 0;

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadProgress(`Uploading ${i + 1} of ${filesToUpload.length}: ${file.name}...`);
        try {
          const url = await uploadSingleFile(file);
          newUrls.push(url);
        } catch (err: any) {
          console.error('[MultiFileUpload] File upload error:', err);
          failureCount++;
          const msg =
            err?.response?.data?.message || err?.message || 'Server upload failed. Verify storage connection.';
          setError(`Failed to upload "${file.name}": ${msg}`);
        }
      }

      if (newUrls.length > 0) {
        onChange([...value, ...newUrls]);
      }

      setUploading(false);
      setUploadProgress(null);
    },
    [value, maxFiles, maxBytes, folder, onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveUrl = (indexToRemove: number) => {
    const updated = value.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  const handleAddManualUrl = () => {
    const trimmed = manualUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setError('Please provide a valid URL starting with https:// or http://');
      return;
    }
    if (value.includes(trimmed)) {
      setError('This URL has already been added.');
      return;
    }
    setError(null);
    onChange([...value, trimmed]);
    setManualUrl('');
    setShowManualUrlInput(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-xs font-semibold text-slate-300 block">
            {label}
            {value.length > 0 && (
              <span className="text-[11px] font-normal text-slate-500 ml-1.5">
                ({value.length} of {maxFiles})
              </span>
            )}
          </label>
        )}
        {allowExternalUrls && !disabled && (
          <button
            type="button"
            onClick={() => setShowManualUrlInput(!showManualUrlInput)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium transition-colors cursor-pointer"
          >
            {showManualUrlInput ? 'Cancel URL entry' : '+ Add External URL'}
          </button>
        )}
      </div>

      {/* Manual URL entry if toggled */}
      {showManualUrlInput && (
        <div className="flex gap-2 p-2.5 rounded-lg border border-slate-700 bg-slate-900/90 animate-in fade-in-0 duration-150">
          <input
            type="url"
            placeholder="https://example.com/evidence-document.pdf"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddManualUrl())}
            className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddManualUrl}
            disabled={!manualUrl.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
          >
            Add URL
          </Button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptString}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading || value.length >= maxFiles}
      />

      {/* Drag & Drop Area */}
      {value.length < maxFiles && (
        <div
          role="button"
          tabIndex={disabled || uploading ? -1 : 0}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled && !uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-all cursor-pointer ${
            dragOver
              ? 'border-cyan-500 bg-cyan-500/10'
              : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
          } ${disabled || uploading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-1.5 py-2">
              <RefreshCw className="h-6 w-6 text-cyan-400 animate-spin" />
              <p className="text-xs font-semibold text-cyan-300">
                {uploadProgress || 'Uploading files to Cloudinary...'}
              </p>
            </div>
          ) : (
            <>
              <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <Upload className="h-4 w-4" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-200">
                  Click or drag files here to upload
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Images (PNG, JPG, WEBP) &amp; Documents (PDF, DOCX) up to {Math.round(maxBytes / 1024 / 1024)} MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Uploaded Files List */}
      {value.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {value.map((url, idx) => {
            const isImg = isImageFile(url);
            const fileName = url.split('/').pop() || `Attachment ${idx + 1}`;

            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isImg ? (
                    <div className="h-9 w-9 rounded overflow-hidden border border-slate-700 shrink-0 bg-slate-950">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-9 w-9 rounded border border-slate-700 shrink-0 bg-slate-950 flex items-center justify-center text-slate-400">
                      <FileText className="h-4 w-4 text-cyan-400" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-slate-200 hover:text-cyan-400 flex items-center gap-1.5 truncate group-hover:underline"
                    >
                      <span className="truncate">{fileName}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                    </a>
                    <span className="text-[10px] text-slate-500 block truncate font-mono mt-0.5">
                      {url}
                    </span>
                  </div>
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveUrl(idx)}
                    aria-label="Remove attachment"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-950/30 border border-red-900/50 text-red-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {hint && !error && (
        <p className="text-[11px] text-slate-500">{hint}</p>
      )}
    </div>
  );
}
