import { useState, useCallback } from "react";
import { storageService, UploadFolder } from "../services/storage.service";
import toast from "react-hot-toast";

export interface UseFileUploadOptions {
  folder: UploadFolder;
  maxSizeMB?: number;
  allowedTypes?: string[];
  onSuccess?: (key: string) => void;
  onError?: (error: Error) => void;
}

export const useFileUpload = (options: UseFileUploadOptions) => {
  const {
    folder,
    maxSizeMB = 10,
    allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    onSuccess,
    onError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`);
      return false;
    }
    return true;
  };

  const upload = useCallback(
    async (file: File) => {
      if (!validateFile(file)) return null;

      try {
        setIsUploading(true);
        setProgress(0);
        setStorageKey(null);
        setPublicUrl(null);

        const result = await storageService.uploadFile(file, folder, (e) => {
          if (e.total) {
            setProgress(Math.round((e.loaded * 100) / e.total));
          }
        });

        setStorageKey(result.key);
        setPublicUrl(result.url);
        setProgress(100);
        if (onSuccess) onSuccess(result.key);
        return result;
      } catch (err: any) {
        console.error("Upload failed:", err);
        const error = new Error(err.response?.data?.message || err.message || "Upload failed");
        toast.error(error.message);
        if (onError) onError(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [folder, maxSizeMB, allowedTypes, onSuccess, onError]
  );

  return {
    upload,
    isUploading,
    progress,
    storageKey,
    publicUrl,
  };
};

export const useMultipleFileUpload = (options: UseFileUploadOptions) => {
  const {
    folder,
    maxSizeMB = 10,
    allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    onSuccess,
    onError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progresses, setProgresses] = useState<number[]>([]);
  const [storageKeys, setStorageKeys] = useState<string[]>([]);
  const [publicUrls, setPublicUrls] = useState<string[]>([]);

  const validateFile = (file: File): boolean => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File ${file.name} exceeds ${maxSizeMB}MB`);
      return false;
    }
    if (!allowedTypes.includes(file.type)) {
      toast.error(`File ${file.name} has invalid type.`);
      return false;
    }
    return true;
  };

  const uploadMultiple = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter(validateFile);
      if (validFiles.length === 0) return [];

      try {
        setIsUploading(true);
        setProgresses(new Array(validFiles.length).fill(0));
        setStorageKeys([]);
        setPublicUrls([]);

        const results = await storageService.uploadMultipleFiles(
          validFiles,
          folder,
          (index, e) => {
            if (e.total) {
              setProgresses((prev) => {
                const next = [...prev];
                next[index] = Math.round((e.loaded * 100) / e.total);
                return next;
              });
            }
          }
        );

        const keys = results.map((r) => r.key);
        const urls = results.map((r) => r.url);
        setStorageKeys(keys);
        setPublicUrls(urls);
        return keys;
      } catch (err: any) {
        console.error("Multiple upload failed:", err);
        const error = new Error(err.response?.data?.message || err.message || "Upload failed");
        toast.error(error.message);
        if (onError) onError(error);
        return [];
      } finally {
        setIsUploading(false);
      }
    },
    [folder, maxSizeMB, allowedTypes, onSuccess, onError]
  );

  return {
    uploadMultiple,
    isUploading,
    progresses,
    storageKeys,
    publicUrls,
  };
};
