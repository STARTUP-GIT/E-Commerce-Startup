import type { Request, Response, NextFunction } from "express";
import { getAdminPermissions, matchesPermission } from "../modules/admin/services/permissionService.js";

declare global {
    namespace Express {
        interface Request {
            adminPermissions?: string[];
        }
    }
}

/**
 * Authorizes the authenticated admin against one or more permission keys
 * (see `modules/admin/services/permissionCatalog.ts`).
 *
 * Usage:
 *   router.use(adminAuth);
 *   router.get("/", requirePermission("customers.view"), list);
 *   router.post("/", requirePermission("customers.manage"), create);
 */
export const requirePermission =
    (...required: string[]) =>
    async (req: Request, res: Response, next: NextFunction) => {
        if (!req.adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        try {
            const granted = await getAdminPermissions({
                id: req.adminId
            });
            req.adminPermissions = granted;

            const allowed = required.some((key) => matchesPermission(granted, key));
            if (!allowed) {
                return res.status(403).json({
                    message: "You do not have permission to perform this action",
                    required
                });
            }

            return next();
        } catch (error) {
            console.error("PERMISSION CHECK FAILED:", error);
            return res.status(500).json({ message: "Unable to verify permissions" });
        }
    };

/** Attach permissions to the request without blocking (for shaping responses). */
export const attachPermissions = async (req: Request, _res: Response, next: NextFunction) => {
    if (req.adminId && !req.adminPermissions) {
        try {
            req.adminPermissions = await getAdminPermissions({ id: req.adminId });
        } catch {
            req.adminPermissions = [];
        }
    }
    next();
};
