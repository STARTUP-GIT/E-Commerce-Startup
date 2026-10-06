import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import { cache } from "../../../middleware/cache.js";
import {
    getAdminBranding,
    getPublicBranding,
    updateAdminBranding
} from "../controllers/brandingController.js";

/**
 * Public branding router → mounted at `/api/branding`.
 * Every frontend (Customer, Seller, Admin) reads this endpoint.
 */
export const publicBrandingRouter = Router();

publicBrandingRouter.get("/", cache(60), getPublicBranding);
publicBrandingRouter.get("/public", cache(60), getPublicBranding);

/**
 * Admin branding router → mounted at `/api/admin/settings/branding`.
 */
export const adminBrandingRouter = Router();

adminBrandingRouter.use(adminAuth);
adminBrandingRouter.get("/", requirePermission("branding.view"), getAdminBranding);
adminBrandingRouter.put("/", requirePermission("branding.manage"), updateAdminBranding);

export default adminBrandingRouter;
