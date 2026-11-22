import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import { adminExportLimiter } from "../../../middleware/rateLimiter.js";
import { getExport } from "../controllers/exportController.js";

const router = Router();

router.use(adminAuth);

router.get("/:type", adminExportLimiter, requirePermission("reports.export"), getExport);

export default router;
