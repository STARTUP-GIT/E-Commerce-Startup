import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import { getSidebarBadges } from "../controllers/badgeController.js";

const router = Router();

router.use(adminAuth);

// All admins can view sidebar counts (or require dashboard.view)
router.get("/", requirePermission("dashboard.view"), getSidebarBadges);

export default router;
