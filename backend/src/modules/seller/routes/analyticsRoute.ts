import express from "express";
import {
    getDashboard,
    getSalesSummary,
    getRevenue,
    getMonthlyRevenue,
    getTopSellingProducts,
    getLowStockProducts,
    getRecentOrders
} from "../controllers/analyticsController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";

const router = express.Router();

router.get("/api/analytics/dashboard", sellerAuth, getDashboard);
router.get("/api/analytics/sales-summary", sellerAuth, getSalesSummary);
router.get("/api/analytics/revenue", sellerAuth, getRevenue);
router.get("/api/analytics/monthly-revenue", sellerAuth, getMonthlyRevenue);
router.get("/api/analytics/top-selling", sellerAuth, getTopSellingProducts);
router.get("/api/analytics/low-stock", sellerAuth, getLowStockProducts);
router.get("/api/analytics/recent-orders", sellerAuth, getRecentOrders);

export default router;
