import type { Request, Response } from "express";

import storageService from "../services/storage.service.js";

import type {
  DeleteFileRequest,
  ReplaceImageRequest,
  UploadFolder,
} from "../types/storage.types.js";

class StorageController {
  /**
   * Upload Single Image
   */
  async uploadImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image uploaded.",
        });
      }

      const folder = req.body.folder as UploadFolder;

      const uploaded = await storageService.uploadImage(req.file, folder);

      return res.status(200).json({
        success: true,
        message: "Image uploaded successfully.",
        data: uploaded,
      });
    } catch (error: any) {
      console.error("[Storage] Upload Image:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Image upload failed.",
      });
    }
  }

  /**
   * Upload Multiple Images
   */
  async uploadMultipleImages(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No images uploaded.",
        });
      }

      const folder = req.body.folder as UploadFolder;

      const uploaded = await storageService.uploadMultipleImages(
        files,
        folder
      );

      return res.status(200).json({
        success: true,
        message: "Images uploaded successfully.",
        data: uploaded,
      });
    } catch (error: any) {
      console.error("[Storage] Upload Multiple Images:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Multiple image upload failed.",
      });
    }
  }

  /**
   * Upload Document
   */
  async uploadDocument(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No document uploaded.",
        });
      }

      const folder = req.body.folder as UploadFolder;

      const uploaded = await storageService.uploadDocument(
        req.file,
        folder
      );

      return res.status(200).json({
        success: true,
        message: "Document uploaded successfully.",
        data: uploaded,
      });
    } catch (error: any) {
      console.error("[Storage] Upload Document:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Document upload failed.",
      });
    }
  }

  /**
   * Delete Image
   */
  async deleteImage(req: Request, res: Response) {
    try {
      const body: DeleteFileRequest = req.body;

      const deleted = await storageService.deleteImage(body);

      return res.status(200).json({
        success: true,
        message: "Image deleted successfully.",
        data: deleted,
      });
    } catch (error: any) {
      console.error("[Storage] Delete Image:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Delete failed.",
      });
    }
  }

  /**
   * Delete Document
   */
  async deleteDocument(req: Request, res: Response) {
    try {
      const body: DeleteFileRequest = req.body;

      const deleted = await storageService.deleteDocument(body);

      return res.status(200).json({
        success: true,
        message: "Document deleted successfully.",
        data: deleted,
      });
    } catch (error: any) {
      console.error("[Storage] Delete Document:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Delete failed.",
      });
    }
  }

  /**
   * Replace Image
   */
  async replaceImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image uploaded.",
        });
      }

      const body = req.body as ReplaceImageRequest;

      const uploaded = await storageService.replaceImage(
        req.file,
        body
      );

      return res.status(200).json({
        success: true,
        message: "Image replaced successfully.",
        data: uploaded,
      });
    } catch (error: any) {
      console.error("[Storage] Replace Image:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Replace failed.",
      });
    }
  }

  /**
   * Replace Document
   */
  async replaceDocument(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No document uploaded.",
        });
      }

      const body = req.body as ReplaceImageRequest;

      const uploaded = await storageService.replaceDocument(
        req.file,
        body
      );

      return res.status(200).json({
        success: true,
        message: "Document replaced successfully.",
        data: uploaded,
      });
    } catch (error: any) {
      console.error("[Storage] Replace Document:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Replace failed.",
      });
    }
  }

  async generateUploadUrl(req: Request, res: Response) {
    try {
      const body = req.body as {
        filename: string;
        contentType?: string;
      };

      const presigned = await storageService.generateUploadUrl(
        body.filename,
        body.contentType
      );

      return res.status(200).json({
        success: true,
        message: "Upload URL generated successfully.",
        data: presigned,
      });
    } catch (error: any) {
      console.error("[Storage] Generate Upload URL:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Failed to generate upload URL.",
      });
    }
  }
}

export default new StorageController();
