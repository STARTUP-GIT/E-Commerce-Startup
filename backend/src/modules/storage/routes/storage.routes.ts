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

const router = Router();

router.post(
  "/upload-url",
  authGuard,
  validatePresignRequest,
  storageController.generateUploadUrl.bind(storageController)
);

router.post(
  "/image",
  authGuard,
  (req, _res, next) => {
    console.log("[Multer] Incoming Content-Type:", req.headers["content-type"]);
    console.log("[Multer] Content-Length:", req.headers["content-length"]);
    next();
  },
  uploadSingleImage,
  validateSingleImage,
  validateFolder,
  storageController.uploadImage.bind(storageController)
);

router.post(
  "/images",
  authGuard,
  uploadMultipleImages,
  validateMultipleImages,
  validateFolder,
  storageController.uploadMultipleImages.bind(storageController)
);

router.post(
  "/document",
  authGuard,
  uploadDocument.single("document"),
  validateDocument,
  validateFolder,
  storageController.uploadDocument.bind(storageController)
);

router.put(
  "/image",
  authGuard,
  uploadSingleImage,
  validateSingleImage,
  validateFolder,
  validatePublicId,
  storageController.replaceImage.bind(storageController)
);

router.put(
  "/document",
  authGuard,
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
