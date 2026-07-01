import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";

export const getShops = async (req: Request, res: Response) => {
    try {
        const { search, active, page = 1, limit = 10 } = req.query;

        const whereClause: any = {};

        if (active !== undefined) {
            whereClause.isActive = active === "true";
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: String(search), mode: "insensitive" } },
                { slug: { contains: String(search), mode: "insensitive" } },
                { businessName: { contains: String(search), mode: "insensitive" } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [shops, total] = await prisma.$transaction([
            prisma.shop.findMany({
                where: whereClause,
                include: { seller: true },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.shop.count({ where: whereClause })
        ]);

        return res.status(200).json({
            shops,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error: any) {
        console.error("GET SHOPS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);

        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            include: {
                seller: true,
                defaultPickupAddress: true
            }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        return res.status(200).json({ shop });
    } catch (error: any) {
        console.error("GET SHOP DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;

        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        await prisma.shop.delete({
            where: { id: shopId }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_BANNED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop '${shop.name}' permanently deleted by admin.`,
            previousValue: { name: shop.name },
            newValue: null
        });

        return res.status(200).json({ message: "Shop deleted successfully" });
    } catch (error: any) {
        console.error("DELETE SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const approvePackingPermission = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;

        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: { packingFeeApproved: true }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Shop",
            targetId: shopId,
            description: `Packing fee permission approved for shop: ${shop.name}`,
            previousValue: { packingFeeApproved: shop.packingFeeApproved },
            newValue: { packingFeeApproved: true }
        });

        return res.status(200).json({
            message: "Packing fee permission approved successfully",
            shop: updatedShop
        });
    } catch (error: any) {
        console.error("APPROVE PACKING PERMISSION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const rejectPackingPermission = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;

        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                packingFeeApproved: false,
                enablePackingFee: false
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Shop",
            targetId: shopId,
            description: `Packing fee permission rejected/disabled for shop: ${shop.name}`,
            previousValue: { packingFeeApproved: shop.packingFeeApproved, enablePackingFee: shop.enablePackingFee },
            newValue: { packingFeeApproved: false, enablePackingFee: false }
        });

        return res.status(200).json({
            message: "Packing fee permission rejected/disabled",
            shop: updatedShop
        });
    } catch (error: any) {
        console.error("REJECT PACKING PERMISSION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const revokePackingPermission = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;

        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: { packingFeeApproved: false }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Shop",
            targetId: shopId,
            description: `Packing fee permission revoked for shop: ${shop.name}`,
            previousValue: { packingFeeApproved: shop.packingFeeApproved },
            newValue: { packingFeeApproved: false }
        });

        return res.status(200).json({
            message: "Packing fee permission revoked successfully",
            shop: updatedShop
        });
    } catch (error: any) {
        console.error("REVOKE PACKING PERMISSION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const activateShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: { isActive: true }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop ${shop.name} activated by admin`,
            previousValue: { isActive: shop.isActive },
            newValue: { isActive: true }
        });

        return res.status(200).json({ message: "Shop activated successfully", shop: updatedShop });
    } catch (error: any) {
        console.error("ACTIVATE SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deactivateShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: { isActive: false }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop ${shop.name} deactivated by admin`,
            previousValue: { isActive: shop.isActive },
            newValue: { isActive: false }
        });

        return res.status(200).json({ message: "Shop deactivated successfully", shop: updatedShop });
    } catch (error: any) {
        console.error("DEACTIVATE SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const banShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body;

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                isBanned: true,
                isActive: false,
                banReason: reason || "Violations of platform policy"
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_BANNED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop ${shop.name} banned by admin. Reason: ${reason || 'None provided'}`,
            previousValue: { isBanned: shop.isBanned, isActive: shop.isActive },
            newValue: { isBanned: true, isActive: false, banReason: reason }
        });

        return res.status(200).json({ message: "Shop banned successfully", shop: updatedShop });
    } catch (error: any) {
        console.error("BAN SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const unbanShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                isBanned: false,
                isActive: true,
                banReason: null
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_UNBANNED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop ${shop.name} unbanned by admin`,
            previousValue: { isBanned: shop.isBanned, isActive: shop.isActive },
            newValue: { isBanned: false, isActive: true }
        });

        return res.status(200).json({ message: "Shop unbanned successfully", shop: updatedShop });
    } catch (error: any) {
        console.error("UNBAN SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
