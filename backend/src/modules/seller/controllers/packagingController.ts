import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import cloudinaryService from "../../../services/storage/cloudnary.service.js";
import fs from "fs";

/**
 * Get all packaging options for the authenticated seller's shop
 */
export const getPackagingOptions = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const shop = await prisma.shop.findUnique({
            where: { sellerId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found. Please create a shop first." });
        }

        const packagingOptions = await prisma.packagingOption.findMany({
            where: { shopId: shop.id },
            orderBy: { createdAt: "desc" }
        });

        return res.status(200).json({
            packagingOptions,
            shop: {
                id: shop.id,
                name: shop.name
            }
        });
    } catch (error: any) {
        console.error("GET PACKAGING OPTIONS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * Create a new packaging option for the authenticated seller's shop
 */
export const createPackagingOption = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const shop = await prisma.shop.findUnique({
            where: { sellerId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found. Please create a shop first." });
        }

        const {
            name,
            description,
            price,
            imageUrl,
            imagePublicId,
            type,
            applicableCategoryIds,
            applicableProductIds,
            isOptional
        } = req.body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ message: "Packaging name is required" });
        }

        const numPrice = Number(price);
        if (isNaN(numPrice) || numPrice < 0) {
            return res.status(400).json({ message: "Valid price (>= 0) in INR is required" });
        }

        const packagingOption = await prisma.packagingOption.create({
            data: {
                shopId: shop.id,
                name: name.trim(),
                description: description?.trim() || null,
                price: numPrice,
                imageUrl: imageUrl || null,
                imagePublicId: imagePublicId || null,
                type: type?.trim() || "BOX",
                applicableCategoryIds: Array.isArray(applicableCategoryIds) ? applicableCategoryIds : [],
                applicableProductIds: Array.isArray(applicableProductIds) ? applicableProductIds : [],
                isOptional: isOptional !== false,
                status: "PENDING",
                isActive: true
            }
        });

        return res.status(201).json({
            message: "Packaging option created successfully and submitted for admin approval",
            packagingOption
        });
    } catch (error: any) {
        console.error("CREATE PACKAGING OPTION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * Update an existing packaging option
 * If material changes are made (price, name, imageUrl, type, isOptional) to an approved/rejected option,
 * status returns to PENDING for admin review.
 */
export const updatePackagingOption = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const id = String(req.params.id);
        if (!sellerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const shop = await prisma.shop.findUnique({
            where: { sellerId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const existing = await prisma.packagingOption.findFirst({
            where: { id, shopId: shop.id }
        });

        if (!existing) {
            return res.status(404).json({ message: "Packaging option not found" });
        }

        const {
            name,
            description,
            price,
            imageUrl,
            imagePublicId,
            type,
            applicableCategoryIds,
            applicableProductIds,
            isOptional,
            isActive
        } = req.body;

        const updateData: any = {};

        let hasMaterialChange = false;

        if (name !== undefined) {
            const cleanName = String(name).trim();
            if (!cleanName) {
                return res.status(400).json({ message: "Packaging name cannot be empty" });
            }
            if (cleanName !== existing.name) {
                hasMaterialChange = true;
                updateData.name = cleanName;
            }
        }

        if (price !== undefined) {
            const numPrice = Number(price);
            if (isNaN(numPrice) || numPrice < 0) {
                return res.status(400).json({ message: "Valid price (>= 0) in INR is required" });
            }
            if (numPrice !== Number(existing.price)) {
                hasMaterialChange = true;
                updateData.price = numPrice;
            }
        }

        if (imageUrl !== undefined && imageUrl !== existing.imageUrl) {
            hasMaterialChange = true;
            updateData.imageUrl = imageUrl || null;
            updateData.imagePublicId = imagePublicId || null;
        }

        if (type !== undefined && type !== existing.type) {
            hasMaterialChange = true;
            updateData.type = type;
        }

        if (isOptional !== undefined && Boolean(isOptional) !== existing.isOptional) {
            hasMaterialChange = true;
            updateData.isOptional = Boolean(isOptional);
        }

        if (description !== undefined) {
            updateData.description = description?.trim() || null;
        }

        if (applicableCategoryIds !== undefined) {
            updateData.applicableCategoryIds = Array.isArray(applicableCategoryIds) ? applicableCategoryIds : [];
        }

        if (applicableProductIds !== undefined) {
            updateData.applicableProductIds = Array.isArray(applicableProductIds) ? applicableProductIds : [];
        }

        if (isActive !== undefined) {
            updateData.isActive = Boolean(isActive);
        }

        // If material changes occurred and it was not pending, return to PENDING for admin re-approval
        if (hasMaterialChange) {
            updateData.status = "PENDING";
            updateData.rejectionReason = null;
            updateData.reviewedByAdminId = null;
            updateData.reviewedAt = null;
        }

        const updated = await prisma.packagingOption.update({
            where: { id: existing.id },
            data: updateData
        });

        return res.status(200).json({
            message: hasMaterialChange
                ? "Packaging option updated and resubmitted for admin approval"
                : "Packaging option updated successfully",
            packagingOption: updated,
            resubmittedForApproval: hasMaterialChange
        });
    } catch (error: any) {
        console.error("UPDATE PACKAGING OPTION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * Toggle active status of a packaging option
 */
export const togglePackagingOption = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const id = String(req.params.id);
        const { isActive } = req.body;

        if (!sellerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const shop = await prisma.shop.findUnique({
            where: { sellerId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const existing = await prisma.packagingOption.findFirst({
            where: { id, shopId: shop.id }
        });

        if (!existing) {
            return res.status(404).json({ message: "Packaging option not found" });
        }

        const nextActive = isActive !== undefined ? Boolean(isActive) : !existing.isActive;

        const updated = await prisma.packagingOption.update({
            where: { id: existing.id },
            data: { isActive: nextActive }
        });

        return res.status(200).json({
            message: `Packaging option ${nextActive ? "activated" : "deactivated"} successfully`,
            packagingOption: updated
        });
    } catch (error: any) {
        console.error("TOGGLE PACKAGING OPTION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * Delete a packaging option
 * If order snapshots reference it, soft-deactivate by setting isActive: false
 */
export const deletePackagingOption = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const id = String(req.params.id);

        if (!sellerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const shop = await prisma.shop.findUnique({
            where: { sellerId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const existing = await prisma.packagingOption.findFirst({
            where: { id, shopId: shop.id }
        });

        if (!existing) {
            return res.status(404).json({ message: "Packaging option not found" });
        }

        // Check if there are order snapshots referencing this option
        const snapshotCount = await prisma.orderPackagingSnapshot.count({
            where: { packagingOptionId: id }
        });

        if (snapshotCount > 0) {
            // Soft deactivate to protect historical order integrity
            await prisma.packagingOption.update({
                where: { id },
                data: { isActive: false }
            });
            return res.status(200).json({
                message: "Packaging option is associated with historical orders and has been deactivated instead of deleted."
            });
        }

        // If not in any orders, delete image from Cloudinary if publicId exists, then delete record
        if (existing.imagePublicId) {
            try {
                await cloudinaryService.deleteImage(existing.imagePublicId);
            } catch (delErr) {
                console.warn("Failed to delete Cloudinary packaging image:", delErr);
            }
        }

        await prisma.packagingOption.delete({
            where: { id }
        });

        return res.status(200).json({
            message: "Packaging option deleted successfully"
        });
    } catch (error: any) {
        console.error("DELETE PACKAGING OPTION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

/**
 * Upload packaging photograph to Cloudinary
 */
export const uploadPackagingImage = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }

        const result = await cloudinaryService.uploadImage(req.file.path, {
            folder: "atlasbasket/packaging"
        });

        // Clean up temporary local file
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(200).json({
            message: "Packaging photo uploaded successfully",
            url: result.url,
            publicId: result.publicId
        });
    } catch (error: any) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error("UPLOAD PACKAGING IMAGE ERROR:", error);
        return res.status(500).json({ message: error.message || "Failed to upload packaging photograph" });
    }
};
