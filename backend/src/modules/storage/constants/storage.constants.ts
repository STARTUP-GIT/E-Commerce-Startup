import type { UploadFolder } from "../types/storage.types.js";

/**
 * Cloudinary Folder Names
 */
export const STORAGE_FOLDERS: Record<string, UploadFolder> = {
  PRODUCTS: "products",
  PRODUCT_GALLERY: "product-gallery",

  SELLER_PROFILE: "seller-profile",
  CUSTOMER_PROFILE: "customer-profile",

  SHOP_LOGO: "shop-logo",
  SHOP_BANNER: "shop-banner",

  GST_DOCUMENTS: "gst-documents",
  IDENTITY_DOCUMENTS: "identity-documents",

  DELIVERY_PROOF: "delivery-proof",
  PACKING_PROOF: "packing-proof",

  REVIEWS: "reviews",

  CATEGORIES: "categories",

  BANNERS: "banners",
} as const;

/**
 * Maximum File Sizes
 */
export const MAX_FILE_SIZE = {
  IMAGE: 10 * 1024 * 1024, // 10 MB
  DOCUMENT: 20 * 1024 * 1024, // 20 MB
};

/**
 * Allowed Image MIME Types
 */
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
];

/**
 * Allowed Document MIME Types
 */
export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

/**
 * Image Transformations
 */
export const IMAGE_TRANSFORMATIONS = {
  PROFILE: {
    width: 500,
    height: 500,
    crop: "fill",
    gravity: "face",
    quality: "auto",
    fetch_format: "auto",
  },

  PRODUCT: {
    width: 1200,
    height: 1200,
    crop: "limit",
    quality: "auto",
    fetch_format: "auto",
  },

  SHOP_LOGO: {
    width: 600,
    height: 600,
    crop: "fit",
    quality: "auto",
    fetch_format: "auto",
  },

  SHOP_BANNER: {
    width: 1600,
    height: 600,
    crop: "fill",
    quality: "auto",
    fetch_format: "auto",
  },

  REVIEW: {
    width: 800,
    height: 800,
    crop: "limit",
    quality: "auto",
    fetch_format: "auto",
  },
};

/**
 * Upload Error Messages
 */
export const STORAGE_ERRORS = {
  FILE_REQUIRED: "No file uploaded.",

  INVALID_IMAGE:
    "Only JPG, JPEG, PNG, WEBP and AVIF images are allowed.",

  INVALID_DOCUMENT:
    "Only PDF, DOC, DOCX, JPG, JPEG and PNG documents are allowed.",

  IMAGE_UPLOAD_FAILED:
    "Failed to upload image.",

  DOCUMENT_UPLOAD_FAILED:
    "Failed to upload document.",

  DELETE_FAILED:
    "Failed to delete file.",

  REPLACE_FAILED:
    "Failed to replace file.",
};

/**
 * Supported Upload Types
 */
export enum UploadType {
  IMAGE = "IMAGE",
  DOCUMENT = "DOCUMENT",
}
