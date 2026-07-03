import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  DOCUMENT_MIME_TYPES,
  IMAGE_MIME_TYPES,
  MAX_FILE_SIZE,
  STORAGE_ERRORS,
} from "../constants/storage.constants.js";

/**
 * Validate Single Image
 */
export const validateSingleImage = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: STORAGE_ERRORS.FILE_REQUIRED,
    });
    return;
  }

  if (!IMAGE_MIME_TYPES.includes(req.file.mimetype)) {
    res.status(400).json({
      success: false,
      message: STORAGE_ERRORS.INVALID_IMAGE,
    });
    return;
  }

  if (req.file.size > MAX_FILE_SIZE.IMAGE) {
    res.status(400).json({
      success: false,
      message: `Image size must be less than ${
        MAX_FILE_SIZE.IMAGE / 1024 / 1024
      } MB.`,
    });
    return;
  }

  next();
};

/**
 * Validate Multiple Images
 */
export const validateMultipleImages = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.files || !Array.isArray(req.files)) {
    res.status(400).json({
      success: false,
      message: STORAGE_ERRORS.FILE_REQUIRED,
    });
    return;
  }

  for (const file of req.files) {
    if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
      res.status(400).json({
        success: false,
        message: STORAGE_ERRORS.INVALID_IMAGE,
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE.IMAGE) {
      res.status(400).json({
        success: false,
        message: `One or more images exceed ${
          MAX_FILE_SIZE.IMAGE / 1024 / 1024
        } MB.`,
      });
      return;
    }
  }

  next();
};

/**
 * Validate Document
 */
export const validateDocument = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: STORAGE_ERRORS.FILE_REQUIRED,
    });
    return;
  }

  if (!DOCUMENT_MIME_TYPES.includes(req.file.mimetype)) {
    res.status(400).json({
      success: false,
      message: STORAGE_ERRORS.INVALID_DOCUMENT,
    });
    return;
  }

  if (req.file.size > MAX_FILE_SIZE.DOCUMENT) {
    res.status(400).json({
      success: false,
      message: `Document size must be less than ${
        MAX_FILE_SIZE.DOCUMENT / 1024 / 1024
      } MB.`,
    });
    return;
  }

  next();
};

/**
 * Validate Folder Parameter
 */
export const validateFolder = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { folder } = req.body;

  if (!folder || typeof folder !== "string") {
    res.status(400).json({
      success: false,
      message: "Folder is required.",
    });
    return;
  }

  next();
};

/**
 * Validate Public ID
 */
export const validatePublicId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const publicId =
    req.body.publicId ||
    req.params.publicId ||
    req.query.publicId;

  if (!publicId || typeof publicId !== "string") {
    res.status(400).json({
      success: false,
      message: "publicId is required.",
    });
    return;
  }

  next();
};

export const PresignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1).optional(),
});

export const validatePresignRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const result = PresignSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: result.error.issues.map((e) => e.message).join(", "),
    });
    return;
  }

  next();
};
