import type { Request, Response } from "express";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { invalidatePublicCache } from "../../../middleware/cache.js";

export interface MarketplaceSettings {
    gstPercentage: number;
    platformFee: number;
    platformFeeEnabled: boolean;
    packingRules: {
        maxPercentage: number;
        maxAmount: number;
    };
    paymentGateway: {
        selected: string;
    };
    orderSettings: {
        autoConfirm: boolean;
        deliveryCharge: number;
    };
    districtRequired: boolean;
}

const DEFAULT_SETTINGS: MarketplaceSettings = {
    gstPercentage: 18,
    platformFee: 10,
    platformFeeEnabled: true,
    packingRules: {
        maxPercentage: 5,
        maxAmount: 100
    },
    paymentGateway: {
        selected: "razorpay"
    },
    orderSettings: {
        autoConfirm: true,
        deliveryCharge: 10
    },
    districtRequired: true
};

const getMarketplaceSettings = async (): Promise<MarketplaceSettings> => {
    const row = await prisma.marketplaceSetting.findUnique({ where: { id: 1 } });
    if (!row) return DEFAULT_SETTINGS;
    try {
        const data = row.data as unknown as MarketplaceSettings;
        return {
            ...DEFAULT_SETTINGS,
            ...data,
            platformFeeEnabled: data.platformFeeEnabled !== undefined ? Boolean(data.platformFeeEnabled) : true
        };
    } catch (e) {
        return DEFAULT_SETTINGS;
    }
};

const saveMarketplaceSettings = async (settings: MarketplaceSettings): Promise<void> => {
    await prisma.marketplaceSetting.upsert({ where: { id: 1 }, update: { data: settings as any }, create: { id: 1, data: settings as any } });
};

export const getSettings = async (req: Request, res: Response) => {
    try {
        const row = await prisma.marketplaceSetting.findUnique({ where: { id: 1 } });
        const settings = await getMarketplaceSettings();

        // Retrieve last admin who updated fee or settings
        const lastAction = await prisma.adminAction.findFirst({
            where: {
                actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
                targetId: { in: ["platformFee", "global"] }
            },
            orderBy: { performedAt: "desc" },
            include: { admin: { select: { firstName: true, lastName: true, email: true } } }
        });

        return res.status(200).json({
            settings,
            updatedAt: row?.updatedAt || null,
            lastUpdatedBy: lastAction?.admin ? `${lastAction.admin.firstName || "Admin"} ${lastAction.admin.lastName || ""}`.trim() : null,
            lastFeeUpdatedAt: lastAction?.performedAt || row?.updatedAt || null
        });
    } catch (error: any) {
        console.error("GET SETTINGS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const previous = await getMarketplaceSettings();
        const updated = { ...previous, ...req.body };

        await saveMarketplaceSettings(updated);

        invalidatePublicCache();

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Settings",
            targetId: "global",
            description: "Admin updated all platform configurations",
            previousValue: previous,
            newValue: updated
        });

        return res.status(200).json({
            message: "Settings updated successfully",
            settings: updated
        });
    } catch (error: any) {
        console.error("UPDATE SETTINGS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateGST = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const { gstPercentage } = req.body;

        if (gstPercentage === undefined) {
            return res.status(400).json({ message: "gstPercentage is required" });
        }

        const previous = await getMarketplaceSettings();
        const updated = {
            ...previous,
            gstPercentage: Number(gstPercentage)
        };

        await saveMarketplaceSettings(updated);

        invalidatePublicCache();

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Settings",
            targetId: "gst",
            description: `Admin updated GST percentage to ${gstPercentage}%`,
            previousValue: { gstPercentage: previous.gstPercentage },
            newValue: { gstPercentage }
        });

        return res.status(200).json({
            message: "GST percentage updated successfully",
            settings: updated
        });
    } catch (error: any) {
        console.error("UPDATE GST ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updatePlatformFee = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const { platformFee, platformFeeEnabled } = req.body;

        if (platformFee === undefined && platformFeeEnabled === undefined) {
            return res.status(400).json({ message: "platformFee or platformFeeEnabled is required" });
        }

        const previous = await getMarketplaceSettings();
        const updated: MarketplaceSettings = {
            ...previous,
            platformFee: platformFee !== undefined ? Number(platformFee) : previous.platformFee,
            platformFeeEnabled: platformFeeEnabled !== undefined ? Boolean(platformFeeEnabled) : (previous.platformFeeEnabled ?? true)
        };

        await saveMarketplaceSettings(updated);

        invalidatePublicCache();

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Settings",
            targetId: "platformFee",
            description: `Admin updated platform fee to ₹${updated.platformFee} (status: ${updated.platformFeeEnabled ? 'ENABLED' : 'DISABLED'})`,
            previousValue: { platformFee: previous.platformFee, platformFeeEnabled: previous.platformFeeEnabled },
            newValue: { platformFee: updated.platformFee, platformFeeEnabled: updated.platformFeeEnabled }
        });

        return res.status(200).json({
            message: "Platform fee settings updated successfully",
            settings: updated
        });
    } catch (error: any) {
        console.error("UPDATE PLATFORM FEE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updatePackingRules = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const { maxPercentage, maxAmount } = req.body;

        const previous = await getMarketplaceSettings();
        const updated = {
            ...previous,
            packingRules: {
                maxPercentage: maxPercentage !== undefined ? Number(maxPercentage) : previous.packingRules.maxPercentage,
                maxAmount: maxAmount !== undefined ? Number(maxAmount) : previous.packingRules.maxAmount
            }
        };

        await saveMarketplaceSettings(updated);

        invalidatePublicCache();

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Settings",
            targetId: "packingRules",
            description: `Admin updated packing rules configuration`,
            previousValue: previous.packingRules,
            newValue: updated.packingRules
        });

        return res.status(200).json({
            message: "Packing rules updated successfully",
            settings: updated
        });
    } catch (error: any) {
        console.error("UPDATE PACKING RULES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updatePaymentGateway = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const { selected } = req.body;

        if (!selected) {
            return res.status(400).json({ message: "selected gateway name is required" });
        }

        const previous = await getMarketplaceSettings();
        const updated = {
            ...previous,
            paymentGateway: {
                selected: String(selected).toLowerCase()
            }
        };

        await saveMarketplaceSettings(updated);

        invalidatePublicCache();

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Settings",
            targetId: "paymentGateway",
            description: `Admin changed default payment gateway to ${selected}`,
            previousValue: previous.paymentGateway,
            newValue: updated.paymentGateway
        });

        return res.status(200).json({
            message: "Payment gateway updated successfully",
            settings: updated
        });
    } catch (error: any) {
        console.error("UPDATE PAYMENT GATEWAY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateOrderSettings = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const { autoConfirm, deliveryCharge } = req.body;

        const previous = await getMarketplaceSettings();
        const updated = {
            ...previous,
            orderSettings: {
                autoConfirm: autoConfirm !== undefined ? !!autoConfirm : previous.orderSettings.autoConfirm,
                deliveryCharge: deliveryCharge !== undefined ? Number(deliveryCharge) : previous.orderSettings.deliveryCharge
            }
        };

        await saveMarketplaceSettings(updated);

        invalidatePublicCache();

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Settings",
            targetId: "orderSettings",
            description: `Admin updated global order parameters`,
            previousValue: previous.orderSettings,
            newValue: updated.orderSettings
        });

        return res.status(200).json({
            message: "Order settings updated successfully",
            settings: updated
        });
    } catch (error: any) {
        console.error("UPDATE ORDER SETTINGS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
