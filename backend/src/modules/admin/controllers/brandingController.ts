import type { Request, Response } from "express";
import { AdminActionType } from "@prisma/client";
import { logAdminAction } from "../utils/actionLogger.js";
import { invalidatePublicCache } from "../../../middleware/cache.js";
import type { BrandingUpdate } from "../services/brandingService.js";
import {
    getBrandingConfiguration,
    getBrandingSettings,
    saveBranding
} from "../services/brandingService.js";

/** GET /api/branding and GET /api/branding/public — no auth, short CDN cache. */
export const getPublicBranding = async (_req: Request, res: Response) => {
    try {
        const branding = await getBrandingConfiguration();
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        return res.status(200).json(branding);
    } catch (error: any) {
        console.error("GET PUBLIC BRANDING ERROR:", error);
        return res.status(500).json({ message: "Unable to load branding. Please try again." });
    }
};

/** GET /api/admin/settings/branding */
export const getAdminBranding = async (_req: Request, res: Response) => {
    try {
        return res.status(200).json(await getBrandingSettings());
    } catch (error: any) {
        console.error("GET BRANDING ERROR:", error);
        return res.status(500).json({ message: "Unable to load branding. Please try again." });
    }
};

/** PUT /api/admin/settings/branding */
export const updateAdminBranding = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const input = (req.body?.branding && typeof req.body.branding === "object"
            ? req.body.branding
            : req.body) as BrandingUpdate;

        const previous = await getBrandingConfiguration();
        const branding = await saveBranding(input, adminId);

        invalidatePublicCache();

        await logAdminAction({
            adminId,
            actionType: AdminActionType.BRANDING_UPDATED,
            targetType: "MarketplaceBranding",
            targetId: "1",
            description: `Updated marketplace branding ("${previous.brandName}" → "${branding.brandName}")`,
            previousValue: previous,
            newValue: branding,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ branding, message: "Branding updated" });
    } catch (error: any) {
        console.error("UPDATE BRANDING ERROR:", error);
        return res.status(500).json({ message: "Unable to save branding. Please try again." });
    }
};
