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
  | "banners";

export interface UploadImageRequest {
  folder: UploadFolder;
  publicId?: string;
}

export interface UploadedFileResponse {
  success: boolean;
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

export interface DeleteFileRequest {
  publicId: string;
}

export interface DeleteFileResponse {
  success: boolean;
}

export interface ReplaceImageRequest {
  oldPublicId: string;
  folder: UploadFolder;
}