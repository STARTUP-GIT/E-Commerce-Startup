import { Router } from "express";
import { getDashboard, getRevenue, getMonthlyRevenue, getStatistics, getRecentActivities } from "../controllers/analyticsController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = Router();

router.get("/dashboard", adminAuth, getDashboard);
router.get("/revenue", adminAuth, getRevenue);
router.get("/revenue/monthly", adminAuth, getMonthlyRevenue);
router.get("/statistics", adminAuth, getStatistics);
router.get("/recent-activities", adminAuth, getRecentActivities);

export default router;
