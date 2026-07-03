import fs from "fs/promises";

import cloudinaryService from "../../../services/storage/cloudnary.service.js";
import {
  createUploadKey,
  getObjectUrl,
  getPresignedPutUrl,
} from "../../../config/storage.js";

import type {
  DeleteFileRequest,
  ReplaceImageRequest,
  UploadFolder,
} from "../types/storage.types.js";

class StorageService {
  async generateUploadUrl(filename: string, contentType?: string) {
    const key = createUploadKey(filename);
    const uploadUrl = await getPresignedPutUrl(
      key,
      contentType || "application/octet-stream"
    );
    const url = getObjectUrl(key);

    return {
      key,
      uploadUrl,
      url,
    };
  }

  /**
   * Upload Single Image
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder
  ) {
    const uploaded = await cloudinaryService.uploadImage(file.path, {
      folder,
    });

    await this.removeTempFile(file.path);

    return uploaded;
  }

  /**
   * Upload Multiple Images
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: UploadFolder
  ) {
    const uploadedFiles = [];

    for (const file of files) {
      const uploaded = await cloudinaryService.uploadImage(file.path, {
        folder,
      });

      uploadedFiles.push(uploaded);

      await this.removeTempFile(file.path);
    }

    return uploadedFiles;
  }

  /**
   * Upload Document
   */
  async uploadDocument(
    file: Express.Multer.File,
    folder: UploadFolder
  ) {
    const uploaded = await cloudinaryService.uploadDocument(file.path, {
      folder,
    });

    await this.removeTempFile(file.path);

    return uploaded;
  }

  /**
   * Delete Image
   */
  async deleteImage(data: DeleteFileRequest) {
    return cloudinaryService.deleteImage(data.publicId);
  }

  /**
   * Delete Document
   */
  async deleteDocument(data: DeleteFileRequest) {
    return cloudinaryService.deleteDocument(data.publicId);
  }

  /**
   * Replace Image
   */
  async replaceImage(
    file: Express.Multer.File,
    data: ReplaceImageRequest
  ) {
    const uploaded =
      await cloudinaryService.replaceImage(
        data.oldPublicId,
        file.path,
        data.folder
      );

    await this.removeTempFile(file.path);

    return uploaded;
  }

  /**
   * Replace Document
   */
  async replaceDocument(
    file: Express.Multer.File,
    data: ReplaceImageRequest
  ) {
    const uploaded =
      await cloudinaryService.replaceDocument(
        data.oldPublicId,
        file.path,
        data.folder
      );

    await this.removeTempFile(file.path);

    return uploaded;
  }

  /**
   * Delete Multiple Images
   */
  async deleteMultipleImages(publicIds: string[]) {
    return cloudinaryService.deleteMultipleImages(publicIds);
  }

  /**
   * Cleanup Temporary Upload
   */
  private async removeTempFile(filePath: string) {
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore cleanup failures
    }
  }
}

export default new StorageService();
