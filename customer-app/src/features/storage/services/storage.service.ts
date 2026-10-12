import axios from "axios";
import axiosInstance from "@/lib/axios/axiosInstance";

export type UploadFolder =
  | "products"
  | "product-gallery"
  | "seller-profile"
  | "customer-profile"
  | "shop-logo"
  | "shop-banner"
  | "gst-documents"
  | "identity-documents"
  | "delivery-proof"
  | "packing-proof"
  | "reviews"
  | "categories"
  | "banners"
  | "reports"
  | "evidence"
  | "support";

export interface PresignedUrlResponse {
  success: boolean;
  data: {
    url: string;
    uploadUrl: string;
    key: string;
  };
}

class StorageService {
  /**
   * Request a presigned URL from the backend
   */
  async generateUploadUrl(
    folder: UploadFolder,
    fileName: string,
    contentType: string
  ): Promise<PresignedUrlResponse["data"]> {
    const response = await axiosInstance.post<PresignedUrlResponse>(
      "/api/storage/upload-url",
      { folder, filename: fileName, contentType }
    );
    return response.data.data;
  }

  /**
   * Upload the file to the presigned URL via HTTP PUT
   */
  async uploadFileToUrl(
    url: string,
    file: File,
    onProgress?: (progressEvent: any) => void
  ): Promise<void> {
    await axios.put(url, file, {
      headers: {
        "Content-Type": file.type,
      },
      onUploadProgress: onProgress,
    });
  }

  /**
   * Upload file directly to backend which uploads to Cloudinary
   */
  async uploadFile(
    file: File,
    folder: UploadFolder,
    onProgress?: (progressEvent: any) => void
  ): Promise<{ key: string; url: string }> {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("folder", folder);

    const response = await axiosInstance.post<{
      success: boolean;
      data: { publicId: string; url: string };
    }>("/api/storage/image", formData, {
      onUploadProgress: onProgress,
    });

    return { key: response.data.data.publicId, url: response.data.data.url };
  }

  /**
   * Upload document (PDF, DOC, etc.)
   */
  async uploadDocument(
    file: File,
    folder: UploadFolder = "reports",
    onProgress?: (progressEvent: any) => void
  ): Promise<{ key: string; url: string }> {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("folder", folder);

    const response = await axiosInstance.post<{
      success: boolean;
      data: { publicId: string; url: string };
    }>("/api/storage/document", formData, {
      onUploadProgress: onProgress,
    });

    return { key: response.data.data.publicId, url: response.data.data.url };
  }

  /**
   * Intelligently upload either an image or a document to Cloudinary
   */
  async uploadEvidenceFile(
    file: File,
    folder: UploadFolder = "reports",
    onProgress?: (progressEvent: any) => void
  ): Promise<{ key: string; url: string; name: string; size: number; type: string }> {
    const isDoc = file.type === "application/pdf" || 
                  file.type === "application/msword" || 
                  file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                  file.name.endsWith(".pdf");

    const result = isDoc
      ? await this.uploadDocument(file, folder, onProgress)
      : await this.uploadFile(file, folder, onProgress);

    return {
      key: result.key,
      url: result.url,
      name: file.name,
      size: file.size,
      type: file.type,
    };
  }

  /**
   * Upload multiple files in parallel
   */
  async uploadMultipleFiles(
    files: File[],
    folder: UploadFolder,
    onProgress?: (index: number, progressEvent: any) => void
  ): Promise<{ key: string; url: string }[]> {
    const uploadPromises = files.map(async (file, index) => {
      return await this.uploadFile(file, folder, (e) => {
        if (onProgress) onProgress(index, e);
      });
    });
    
    return await Promise.all(uploadPromises);
  }
}

export const storageService = new StorageService();
