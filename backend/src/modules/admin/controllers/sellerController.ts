import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";

export const getSellers = async (req: Request, res: Response) => {
    try {
        const { search, status, page = 1, limit = 10 } = req.query;

        const whereClause: any = {};

        if (status) {
            whereClause.status = String(status);
        }

        if (search) {
            whereClause.OR = [
                { email: { contains: String(search), mode: "insensitive" } },
                { firstName: { contains: String(search), mode: "insensitive" } },
                { lastName: { contains: String(search), mode: "insensitive" } },
                { username: { contains: String(search), mode: "insensitive" } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [sellers, total] = await prisma.$transaction([
            prisma.seller.findMany({
                where: whereClause,
                include: { shop: true },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.seller.count({ where: whereClause })
        ]);

        return res.status(200).json({
            sellers,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error: any) {
        console.error("GET SELLERS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getSeller = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.id);

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: {
                shop: true,
                addresses: true,
                bankAccounts: true,
                strikes: true,
                verifications: {
                    orderBy: { createdAt: "desc" }
                }
            }
        });

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        return res.status(200).json({ seller });
    } catch (error: any) {
        console.error("GET SELLER DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const banSeller = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body;

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId }
        });

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        const updatedSeller = await prisma.seller.update({
            where: { id: sellerId },
            data: {
                isBanned: true,
                status: "BANNED",
                bannedAt: new Date(),
                banReason: reason || "Violations of platform policy"
            }
        });

        // Disable shop belonging to this seller
        await prisma.shop.updateMany({
            where: { sellerId },
            data: { 
                status: "DISABLED",
                rejectionReason: `Banned due to seller ban: ${reason || 'Violations of platform policy'}`
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_BANNED,
            targetType: "Seller",
            targetId: sellerId,
            description: `Seller ${seller.username} banned by admin. Reason: ${reason}`,
            previousValue: { isBanned: seller.isBanned, status: seller.status },
            newValue: { isBanned: true, status: "BANNED", banReason: reason }
        });

        return res.status(200).json({
            message: "Seller banned successfully",
            seller: updatedSeller
        });
    } catch (error: any) {
        console.error("BAN SELLER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const unbanSeller = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.id);
        const adminId = req.adminId!;

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId }
        });

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        const updatedSeller = await prisma.seller.update({
            where: { id: sellerId },
            data: {
                isBanned: false,
                status: "ACTIVE",
                bannedAt: null,
                banReason: null
            }
        });

        // Restore shop status (set back to PENDING, admin can re-approve)
        await prisma.shop.updateMany({
            where: { sellerId },
            data: { 
                status: "PENDING",
                rejectionReason: null
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_UNBANNED,
            targetType: "Seller",
            targetId: sellerId,
            description: `Seller ${seller.username} unbanned by admin`,
            previousValue: { isBanned: seller.isBanned, status: seller.status },
            newValue: { isBanned: false, status: "ACTIVE" }
        });

        return res.status(200).json({
            message: "Seller unbanned successfully",
            seller: updatedSeller
        });
    } catch (error: any) {
        console.error("UNBAN SELLER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteSeller = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.id);
        const adminId = req.adminId!;

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId }
        });

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        await prisma.seller.update({
            where: { id: sellerId },
            data: {
                isDeactivated: true,
                deactivatedAt: new Date()
            }
        });

        // Disable shop
        await prisma.shop.updateMany({
            where: { sellerId },
            data: { status: "DISABLED" }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_BANNED,
            targetType: "Seller",
            targetId: sellerId,
            description: `Seller ${seller.username} soft-deleted/deactivated by admin`,
            previousValue: { isDeactivated: seller.isDeactivated },
            newValue: { isDeactivated: true }
        });

        return res.status(200).json({ message: "Seller deleted successfully" });
    } catch (error: any) {
        console.error("DELETE SELLER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getSellerShop = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.id);
        const shop = await prisma.shop.findUnique({
            where: { sellerId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found for this seller" });
        }

        return res.status(200).json({ shop });
    } catch (error: any) {
        console.error("GET SELLER SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getSellerOrders = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.id);
        const orders = await prisma.sellerOrder.findMany({
            where: { sellerId },
            include: {
                order: {
                    include: { customer: true }
                },
                items: true
            },
            orderBy: { createdAt: "desc" }
        });
        return res.status(200).json({ orders });
    } catch (error: any) {
        console.error("GET SELLER ORDERS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getSellerProducts = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.id);
        const products = await prisma.product.findMany({
            where: { sellerId, isDeleted: false },
            include: { variants: true },
            orderBy: { createdAt: "desc" }
        });
        return res.status(200).json({ products });
    } catch (error: any) {
        console.error("GET SELLER PRODUCTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getSellerAnalytics = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.id);
        const metrics = await prisma.sellerDailyMetric.findMany({
            where: { sellerId },
            orderBy: { date: "desc" },
            take: 30
        });

        const totalEarnings = await prisma.sellerOrder.aggregate({
            where: { sellerId, status: "DELIVERED" },
            _sum: { sellerEarnings: true }
        });

        return res.status(200).json({
            metrics,
            totalEarnings: Number(totalEarnings._sum?.sellerEarnings ?? 0)
        });
    } catch (error: any) {
        console.error("GET SELLER ANALYTICS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const suspendSeller = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body;

        const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
        if (!seller) return res.status(404).json({ message: "Seller not found" });

        const updatedSeller = await prisma.seller.update({
            where: { id: sellerId },
            data: { status: "BANNED", isBanned: true }
        });

        await prisma.shop.updateMany({
            where: { sellerId },
            data: { status: "SUSPENDED" }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_BANNED,
            targetType: "Seller",
            targetId: sellerId,
            description: `Seller ${seller.username} suspended by admin. Reason: ${reason || 'None provided'}`,
            previousValue: { status: seller.status },
            newValue: { status: "SUSPENDED" }
        });

        return res.status(200).json({ message: "Seller suspended successfully", seller: updatedSeller });
    } catch (error: any) {
        console.error("SUSPEND SELLER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const restoreSeller = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.id);
        const adminId = req.adminId!;

        const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
        if (!seller) return res.status(404).json({ message: "Seller not found" });

        const updatedSeller = await prisma.seller.update({
            where: { id: sellerId },
            data: {
                status: "ACTIVE",
                isBanned: false,
                isDeactivated: false,
                bannedAt: null,
                banReason: null,
                deactivatedAt: null
            }
        });

        await prisma.shop.updateMany({
            where: { sellerId },
            data: {
                status: "PENDING",
                rejectionReason: null
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_UNBANNED,
            targetType: "Seller",
            targetId: sellerId,
            description: `Seller ${seller.username} restored by admin`,
            previousValue: { status: seller.status, isBanned: seller.isBanned, isDeactivated: seller.isDeactivated },
            newValue: { status: "ACTIVE", isBanned: false, isDeactivated: false }
        });

        return res.status(200).json({ message: "Seller restored successfully", seller: updatedSeller });
    } catch (error: any) {
        console.error("RESTORE SELLER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const activateSeller = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.id);
        const adminId = req.adminId!;

        const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
        if (!seller) return res.status(404).json({ message: "Seller not found" });

        const updatedSeller = await prisma.seller.update({
            where: { id: sellerId },
            data: {
                status: "ACTIVE",
                isDeactivated: false,
                deactivatedAt: null
            }
        });

        await prisma.shop.updateMany({
            where: { sellerId },
            data: { status: "APPROVED" }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SHOP_APPROVED,
            targetType: "Seller",
            targetId: sellerId,
            description: `Seller ${seller.username} activated by admin`,
            previousValue: { status: seller.status, isDeactivated: seller.isDeactivated },
            newValue: { status: "ACTIVE", isDeactivated: false }
        });

        return res.status(200).json({ message: "Seller activated successfully", seller: updatedSeller });
    } catch (error: any) {
        console.error("ACTIVATE SELLER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deactivateSeller = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.id);
        const adminId = req.adminId!;

        const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
        if (!seller) return res.status(404).json({ message: "Seller not found" });

        const updatedSeller = await prisma.seller.update({
            where: { id: sellerId },
            data: {
                status: "DISABLED",
                isDeactivated: true,
                deactivatedAt: new Date()
            }
        });

        await prisma.shop.updateMany({
            where: { sellerId },
            data: { status: "DISABLED" }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_BANNED,
            targetType: "Seller",
            targetId: sellerId,
            description: `Seller ${seller.username} deactivated by admin`,
            previousValue: { isDeactivated: seller.isDeactivated },
            newValue: { isDeactivated: true }
        });

        return res.status(200).json({ message: "Seller deactivated successfully", seller: updatedSeller });
    } catch (error: any) {
        console.error("DEACTIVATE SELLER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
