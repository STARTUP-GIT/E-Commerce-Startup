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
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/analytics/dashboard", sellerAuth, writeLimiter, getDashboard);
router.get("/api/analytics/sales-summary", sellerAuth, writeLimiter, getSalesSummary);
router.get("/api/analytics/revenue", sellerAuth, writeLimiter, getRevenue);
router.get("/api/analytics/monthly-revenue", sellerAuth, writeLimiter, getMonthlyRevenue);
router.get("/api/analytics/top-selling", sellerAuth, writeLimiter, getTopSellingProducts);
router.get("/api/analytics/low-stock", sellerAuth, writeLimiter, getLowStockProducts);
router.get("/api/analytics/recent-orders", sellerAuth, writeLimiter, getRecentOrders);

export default router;
