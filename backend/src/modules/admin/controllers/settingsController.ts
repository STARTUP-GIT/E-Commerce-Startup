import type { Request, Response } from "express";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";

export interface PlatformSettings {
    gstPercentage: number;
    platformFee: {
        enabled: boolean;
        percentage: number;
        fixedAmount: number;
    };
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

const DEFAULT_SETTINGS: PlatformSettings = {
    gstPercentage: 18,
    platformFee: {
        enabled: false,
        percentage: 0,
        fixedAmount: 0
    },
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

const getPlatformSettings = async (): Promise<PlatformSettings> => {
    const row = await prisma.platformSetting.findUnique({ where: { id: 1 } });
    if (!row) return DEFAULT_SETTINGS;
    try {
        const data = row.data as unknown as PlatformSettings;
        return { ...DEFAULT_SETTINGS, ...data };
    } catch (e) {
        return DEFAULT_SETTINGS;
    }
};

const savePlatformSettings = async (settings: PlatformSettings): Promise<void> => {
    await prisma.platformSetting.upsert({ where: { id: 1 }, update: { data: settings as any }, create: { id: 1, data: settings as any } });
};

export const getSettings = async (req: Request, res: Response) => {
    try {
        const settings = await getPlatformSettings();
        return res.status(200).json({ settings });
    } catch (error: any) {
        console.error("GET SETTINGS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const previous = await getPlatformSettings();
        const updated = { ...previous, ...req.body };

        await savePlatformSettings(updated);

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

        const previous = await getPlatformSettings();
        const updated = {
            ...previous,
            gstPercentage: Number(gstPercentage)
        };

        await savePlatformSettings(updated);

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
        const { enabled, percentage, fixedAmount } = req.body;

        const previous = await getPlatformSettings();
        const updated = {
            ...previous,
            platformFee: {
                enabled: enabled !== undefined ? !!enabled : previous.platformFee.enabled,
                percentage: percentage !== undefined ? Number(percentage) : previous.platformFee.percentage,
                fixedAmount: fixedAmount !== undefined ? Number(fixedAmount) : previous.platformFee.fixedAmount
            }
        };

        await savePlatformSettings(updated);

        await logAdminAction({
            adminId,
            actionType: AdminActionType.MARKETPLACE_SETTINGS_UPDATED,
            targetType: "Settings",
            targetId: "platformFee",
            description: `Admin updated platform fee settings`,
            previousValue: previous.platformFee,
            newValue: updated.platformFee
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

        const previous = await getPlatformSettings();
        const updated = {
            ...previous,
            packingRules: {
                maxPercentage: maxPercentage !== undefined ? Number(maxPercentage) : previous.packingRules.maxPercentage,
                maxAmount: maxAmount !== undefined ? Number(maxAmount) : previous.packingRules.maxAmount
            }
        };

        await savePlatformSettings(updated);

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

        const previous = await getPlatformSettings();
        const updated = {
            ...previous,
            paymentGateway: {
                selected: String(selected).toLowerCase()
            }
        };

        await savePlatformSettings(updated);

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

        const previous = await getPlatformSettings();
        const updated = {
            ...previous,
            orderSettings: {
                autoConfirm: autoConfirm !== undefined ? !!autoConfirm : previous.orderSettings.autoConfirm,
                deliveryCharge: deliveryCharge !== undefined ? Number(deliveryCharge) : previous.orderSettings.deliveryCharge
            }
        };

        await savePlatformSettings(updated);

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
