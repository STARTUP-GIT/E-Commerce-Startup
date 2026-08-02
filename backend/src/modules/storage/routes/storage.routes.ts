import { Router } from "express";

import storageController from "../controllers/storage.controller.js";

import {
  uploadSingleImage,
  uploadMultipleImages,
  uploadDocument,
} from "../../../middleware/multer.js";

import {
  validateSingleImage,
  validateMultipleImages,
  validateDocument,
  validateFolder,
  validatePublicId,
  validatePresignRequest,
} from "../validations/storage.validation.js";

import authGuard from "../../../middleware/authGuard.js";
import { uploadLimiter } from "../../../middleware/rateLimiter.js";

const router = Router();

router.post(
  "/upload-url",
  authGuard,
  uploadLimiter,
  validatePresignRequest,
  storageController.generateUploadUrl.bind(storageController)
);

router.post(
  "/image",
  authGuard,
  uploadLimiter,
  uploadSingleImage,
  validateSingleImage,
  validateFolder,
  storageController.uploadImage.bind(storageController)
);

router.post(
  "/images",
  authGuard,
  uploadLimiter,
  uploadMultipleImages,
  validateMultipleImages,
  validateFolder,
  storageController.uploadMultipleImages.bind(storageController)
);

router.post(
  "/document",
  authGuard,
  uploadLimiter,
  uploadDocument.single("document"),
  validateDocument,
  validateFolder,
  storageController.uploadDocument.bind(storageController)
);

router.put(
  "/image",
  authGuard,
  uploadLimiter,
  uploadSingleImage,
  validateSingleImage,
  validateFolder,
  validatePublicId,
  storageController.replaceImage.bind(storageController)
);

router.put(
  "/document",
  authGuard,
  uploadLimiter,
  uploadDocument.single("document"),
  validateDocument,
  validateFolder,
  validatePublicId,
  storageController.replaceDocument.bind(storageController)
);

router.delete(
  "/image",
  authGuard,
  validatePublicId,
  storageController.deleteImage.bind(storageController)
);

router.delete(
  "/document",
  authGuard,
  validatePublicId,
  storageController.deleteDocument.bind(storageController)
);

export default router;
