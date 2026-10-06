import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getReportedProducts,
    getReportedShops,
    resolveReport,
    deleteReport
} from "../controllers/reportController.js";

const router = Router();

router.use(adminAuth);

router.get("/products", requirePermission("reports.view"), getReportedProducts);
router.get("/shops", requirePermission("reports.view"), getReportedShops);
router.patch("/:id/resolve", requirePermission("moderation.manage"), resolveReport);
router.delete("/:id", requirePermission("moderation.manage"), deleteReport);

export default router;
