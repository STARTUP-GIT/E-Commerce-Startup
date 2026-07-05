import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";

export const getShops = async (req: Request, res: Response) => {
    try {
        const { search, status, page = 1, limit = 10 } = req.query;

        const whereClause: any = {};

        if (status) {
            whereClause.status = String(status);
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

export const approveShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;

        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            include: { seller: true }
        });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                status: "APPROVED",
                reviewedByAdminId: adminId,
                reviewedAt: new Date(),
                rejectionReason: null
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SHOP_APPROVED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop ${shop.name} approved by admin`,
            previousValue: { status: shop.status },
            newValue: { status: "APPROVED" }
        });

        return res.status(200).json({ message: "Shop approved successfully", shop: updatedShop });
    } catch (error: any) {
        console.error("APPROVE SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const rejectShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body;

        const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            include: { seller: true }
        });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                status: "REJECTED",
                reviewedByAdminId: adminId,
                reviewedAt: new Date(),
                rejectionReason: reason || "Shop does not meet platform criteria"
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SHOP_REJECTED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop ${shop.name} rejected by admin. Reason: ${reason}`,
            previousValue: { status: shop.status },
            newValue: { status: "REJECTED", rejectionReason: reason }
        });

        return res.status(200).json({ message: "Shop rejected", shop: updatedShop });
    } catch (error: any) {
        console.error("REJECT SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const suspendShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body;

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                status: "SUSPENDED",
                reviewedByAdminId: adminId,
                reviewedAt: new Date(),
                rejectionReason: reason || "Suspended for policy review"
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SHOP_SUSPENDED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop ${shop.name} suspended by admin. Reason: ${reason || 'None provided'}`,
            previousValue: { status: shop.status },
            newValue: { status: "SUSPENDED" }
        });

        return res.status(200).json({ message: "Shop suspended successfully", shop: updatedShop });
    } catch (error: any) {
        console.error("SUSPEND SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const disableShop = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body;

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                status: "DISABLED",
                reviewedByAdminId: adminId,
                reviewedAt: new Date(),
                rejectionReason: reason || "Permanently disabled by admin"
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SHOP_DISABLED,
            targetType: "Shop",
            targetId: shopId,
            description: `Shop ${shop.name} disabled by admin. Reason: ${reason || 'None provided'}`,
            previousValue: { status: shop.status },
            newValue: { status: "DISABLED" }
        });

        return res.status(200).json({ message: "Shop disabled successfully", shop: updatedShop });
    } catch (error: any) {
        console.error("DISABLE SHOP ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateShopConfig = async (req: Request, res: Response) => {
    try {
        const shopId = String(req.params.id);
        const adminId = req.adminId!;
        const { commissionPercentage, customerDeliveryShare, sellerDeliveryShare, enablePackingFee, packingFeeApproved } = req.body;

        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        if (!shop) return res.status(404).json({ message: "Shop not found" });

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                commissionPercentage: commissionPercentage !== undefined ? Number(commissionPercentage) : undefined,
                customerDeliveryShare: customerDeliveryShare !== undefined ? Number(customerDeliveryShare) : undefined,
                sellerDeliveryShare: sellerDeliveryShare !== undefined ? Number(sellerDeliveryShare) : undefined,
                enablePackingFee: enablePackingFee !== undefined ? Boolean(enablePackingFee) : undefined,
                packingFeeApproved: packingFeeApproved !== undefined ? Boolean(packingFeeApproved) : undefined,
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Shop",
            targetId: shopId,
            description: `Configured shop settings for ${shop.name}`,
            previousValue: {
                commissionPercentage: shop.commissionPercentage,
                customerDeliveryShare: shop.customerDeliveryShare,
                sellerDeliveryShare: shop.sellerDeliveryShare,
                enablePackingFee: shop.enablePackingFee,
                packingFeeApproved: shop.packingFeeApproved
            },
            newValue: {
                commissionPercentage: updatedShop.commissionPercentage,
                customerDeliveryShare: updatedShop.customerDeliveryShare,
                sellerDeliveryShare: updatedShop.sellerDeliveryShare,
                enablePackingFee: updatedShop.enablePackingFee,
                packingFeeApproved: updatedShop.packingFeeApproved
            }
        });

        return res.status(200).json({ message: "Shop configurations updated successfully", shop: updatedShop });
    } catch (error: any) {
        console.error("UPDATE SHOP CONFIG ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
