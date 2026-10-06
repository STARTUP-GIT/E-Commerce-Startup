import { Router } from "express";
import { getDashboard, getRevenue, getMonthlyRevenue, getStatistics, getRecentActivities } from "../controllers/analyticsController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";

const router = Router();

router.get("/dashboard", adminAuth, requirePermission("analytics.view"), getDashboard);
router.get("/revenue", adminAuth, requirePermission("analytics.view"), getRevenue);
router.get("/revenue/monthly", adminAuth, requirePermission("analytics.view"), getMonthlyRevenue);
router.get("/statistics", adminAuth, requirePermission("analytics.view"), getStatistics);
router.get("/recent-activities", adminAuth, requirePermission("analytics.view"), getRecentActivities);

export default router;
