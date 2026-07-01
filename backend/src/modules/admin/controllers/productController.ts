import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";

export const getProducts = async (req: Request, res: Response) => {
    try {
        const { search, categoryId, status, page = 1, limit = 10 } = req.query;

        const whereClause: any = { isDeleted: false };

        if (categoryId) whereClause.categoryId = String(categoryId);
        if (status) whereClause.status = String(status);
        if (search) {
            whereClause.OR = [
                { name: { contains: String(search), mode: "insensitive" } },
                { description: { contains: String(search), mode: "insensitive" } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [products, total] = await prisma.$transaction([
            prisma.product.findMany({
                where: whereClause,
                include: { seller: { include: { shop: true } }, variants: true },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.product.count({ where: whereClause })
        ]);

        return res.status(200).json({
            products,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (error: any) {
        console.error("GET PRODUCTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getProduct = async (req: Request, res: Response) => {
    try {
        const productId = String(req.params.id);

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                seller: { include: { shop: true } },
                variants: true,
                images: true,
                attributes: true,
                reports: {
                    include: { customer: { select: { id: true, username: true, email: true } } }
                }
            }
        });

        if (!product) return res.status(404).json({ message: "Product not found" });

        return res.status(200).json({ product });
    } catch (error: any) {
        console.error("GET PRODUCT DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const productId = String(req.params.id);
        const adminId = req.adminId!;

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return res.status(404).json({ message: "Product not found" });

        await prisma.product.update({
            where: { id: productId },
            data: { isDeleted: true, status: "REMOVED_BY_ADMIN" }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.PRODUCT_REMOVED,
            targetType: "Product",
            targetId: productId,
            description: `Product '${product.name}' soft-deleted by admin.`,
            previousValue: { isDeleted: product.isDeleted, status: product.status },
            newValue: { isDeleted: true, status: "REMOVED_BY_ADMIN" }
        });

        return res.status(200).json({ message: "Product deleted successfully" });
    } catch (error: any) {
        console.error("DELETE PRODUCT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const restoreProduct = async (req: Request, res: Response) => {
    try {
        const productId = String(req.params.id);
        const adminId = req.adminId!;

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return res.status(404).json({ message: "Product not found" });

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: { isDeleted: false, status: "ACTIVE" }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.PRODUCT_APPROVED,
            targetType: "Product",
            targetId: productId,
            description: `Product '${product.name}' restored by admin.`,
            previousValue: { isDeleted: product.isDeleted, status: product.status },
            newValue: { isDeleted: false, status: "ACTIVE" }
        });

        return res.status(200).json({ message: "Product restored successfully", product: updatedProduct });
    } catch (error: any) {
        console.error("RESTORE PRODUCT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const hideProduct = async (req: Request, res: Response) => {
    try {
        const productId = String(req.params.id);
        const adminId = req.adminId!;

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return res.status(404).json({ message: "Product not found" });

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: { status: "INACTIVE" }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.PRODUCT_REMOVED,
            targetType: "Product",
            targetId: productId,
            description: `Product '${product.name}' hidden by admin.`,
            previousValue: { status: product.status },
            newValue: { status: "INACTIVE" }
        });

        return res.status(200).json({ message: "Product hidden successfully", product: updatedProduct });
    } catch (error: any) {
        console.error("HIDE PRODUCT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const unhideProduct = async (req: Request, res: Response) => {
    try {
        const productId = String(req.params.id);
        const adminId = req.adminId!;

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) return res.status(404).json({ message: "Product not found" });

        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: { status: "ACTIVE" }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.PRODUCT_APPROVED,
            targetType: "Product",
            targetId: productId,
            description: `Product '${product.name}' set active by admin.`,
            previousValue: { status: product.status },
            newValue: { status: "ACTIVE" }
        });

        return res.status(200).json({ message: "Product activated successfully", product: updatedProduct });
    } catch (error: any) {
        console.error("UNHIDE PRODUCT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getReportedProducts = async (req: Request, res: Response) => {
    try {
        const reportedProducts = await prisma.productReport.findMany({
            where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
            include: {
                product: true,
                customer: { select: { id: true, username: true, email: true } }
            },
            orderBy: { createdAt: "desc" }
        });
        return res.status(200).json({ reports: reportedProducts });
    } catch (error: any) {
        console.error("GET REPORTED PRODUCTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
