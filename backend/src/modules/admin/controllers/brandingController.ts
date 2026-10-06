import type { Request, Response } from "express";
import { AdminActionType } from "@prisma/client";
import { logAdminAction } from "../utils/actionLogger.js";
import { invalidatePublicCache } from "../../../middleware/cache.js";
import type { BrandingApp, BrandingUpdate } from "../services/brandingService.js";
import {
    getBrandingConfiguration,
    getBrandingSettings,
    saveBranding
} from "../services/brandingService.js";

const parseBrandingApp = (value: unknown): BrandingApp | null => {
    if (value === undefined) return "CUSTOMER";
    if (typeof value !== "string") return null;
    const app = value.toUpperCase();
    return app === "CUSTOMER" || app === "SELLER" ? app : null;
};

/** GET /api/branding and GET /api/branding/public — no auth, short CDN cache. */
export const getPublicBranding = async (req: Request, res: Response) => {
    try {
        const app = parseBrandingApp(req.query.app);
        if (!app) return res.status(400).json({ message: "Invalid branding app. Use customer or seller." });
        const branding = await getBrandingConfiguration(app);
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        return res.status(200).json(branding);
    } catch (error: any) {
        console.error("GET PUBLIC BRANDING ERROR:", error);
        return res.status(500).json({ message: "Unable to load branding. Please try again." });
    }
};

/** GET /api/admin/settings/branding */
export const getAdminBranding = async (req: Request, res: Response) => {
    try {
        const app = parseBrandingApp(req.query.app);
        if (!app) return res.status(400).json({ message: "Invalid branding app. Use customer or seller." });
        return res.status(200).json(await getBrandingSettings(app));
    } catch (error: any) {
        console.error("GET BRANDING ERROR:", error);
        return res.status(500).json({ message: "Unable to load branding. Please try again." });
    }
};

/** PUT /api/admin/settings/branding */
export const updateAdminBranding = async (req: Request, res: Response) => {
    try {
        const app = parseBrandingApp(req.query.app);
        if (!app) return res.status(400).json({ message: "Invalid branding app. Use customer or seller." });
        const adminId = req.adminId!;
        const input = (req.body?.branding && typeof req.body.branding === "object"
            ? req.body.branding
            : req.body) as BrandingUpdate;

        const previous = await getBrandingConfiguration(app);
        const branding = await saveBranding(input, adminId, app);

        invalidatePublicCache();

        await logAdminAction({
            adminId,
            actionType: AdminActionType.BRANDING_UPDATED,
            targetType: "MarketplaceBranding",
            targetId: app,
            description: `Updated ${app.toLowerCase()} marketplace branding ("${previous.brandName}" → "${branding.brandName}")`,
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
