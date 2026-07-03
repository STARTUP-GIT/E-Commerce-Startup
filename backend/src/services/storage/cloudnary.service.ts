import cloudinary from '../../config/cloudinary.js';

export interface UploadOptions {
  folder: string;
  publicId?: string;
}

class CloudinaryService {
  /**
   * Upload Image
   */
  async uploadImage(
    filePath: string,
    options: UploadOptions
  ) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: "image",
        overwrite: true,
        quality: "auto",
        fetch_format: "auto",
      });

      return {
        success: true,
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
      };
    } catch (error: any) {
      const message = error?.message?.includes("Cloudinary")
        ? error.message
        : `Cloudinary upload failed: ${error?.message || "Unknown error"}`;
      console.error("[Cloudinary] Image Upload Error:", error);
      throw new Error(message);
    }
  }

  /**
   * Delete Image
   */
  async deleteImage(publicId: string) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      });

      return {
        success: result.result === "ok",
      };
    } catch (error: any) {
      const message = error?.message?.includes("Cloudinary")
        ? error.message
        : `Cloudinary delete failed: ${error?.message || "Unknown error"}`;
      console.error("[Cloudinary] Delete Image Error:", error);
      throw new Error(message);
    }
  }

  /**
   * Upload Document (PDF, DOC, etc.)
   */
  async uploadDocument(
    filePath: string,
    options: UploadOptions
  ) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: "raw",
        overwrite: true,
      });

      return {
        success: true,
        publicId: result.public_id,
        url: result.secure_url,
        bytes: result.bytes,
        format: result.format,
      };
    } catch (error: any) {
      const message = error?.message?.includes("Cloudinary")
        ? error.message
        : `Cloudinary document upload failed: ${error?.message || "Unknown error"}`;
      console.error("[Cloudinary] Document Upload Error:", error);
      throw new Error(message);
    }
  }

  /**
   * Delete Document
   */
  async deleteDocument(publicId: string) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "raw",
      });

      return {
        success: result.result === "ok",
      };
    } catch (error: any) {
      const message = error?.message?.includes("Cloudinary")
        ? error.message
        : `Cloudinary document delete failed: ${error?.message || "Unknown error"}`;
      console.error("[Cloudinary] Delete Document Error:", error);
      throw new Error(message);
    }
  }

  /**
   * Upload Multiple Images
   */
  async uploadMultipleImages(
    filePaths: string[],
    folder: string
  ) {
    return Promise.all(
      filePaths.map((file) =>
        this.uploadImage(file, { folder })
      )
    );
  }

  /**
   * Delete Multiple Images
   */
  async deleteMultipleImages(publicIds: string[]) {
    return Promise.all(
      publicIds.map((id) => this.deleteImage(id))
    );
  }

  /**
   * Replace Image
   */
  async replaceImage(
    oldPublicId: string,
    newFilePath: string,
    folder: string
  ) {
    await this.deleteImage(oldPublicId);

    return this.uploadImage(newFilePath, {
      folder,
    });
  }

  /**
   * Replace Document
   */
  async replaceDocument(
    oldPublicId: string,
    newFilePath: string,
    folder: string
  ) {
    await this.deleteDocument(oldPublicId);

    return this.uploadDocument(newFilePath, {
      folder,
    });
  }
}

export default new CloudinaryService();