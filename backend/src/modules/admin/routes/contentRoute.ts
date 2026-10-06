import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getBlocks,
    createBlock,
    updateBlock,
    updateBlockStatus,
    deleteBlock,
    getPublicBlocks
} from "../controllers/contentController.js";

/**
 * Admin CMS router → mounted at `/api/admin/content`.
 */
export const adminContentRouter = Router();

adminContentRouter.use(adminAuth);
adminContentRouter.get("/", requirePermission("content.view"), getBlocks);
adminContentRouter.post("/", requirePermission("content.manage"), createBlock);
adminContentRouter.patch("/:id/status", requirePermission("content.manage"), updateBlockStatus);
adminContentRouter.patch("/:id", requirePermission("content.manage"), updateBlock);
adminContentRouter.delete("/:id", requirePermission("content.manage"), deleteBlock);

/**
 * Public CMS router → mounted at `/api/content/public` (no auth, no admin limiter).
 */
export const publicContentRouter = Router();

publicContentRouter.get("/", getPublicBlocks);

export default adminContentRouter;
