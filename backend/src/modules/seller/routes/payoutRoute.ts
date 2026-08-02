import express from "express";
import {
    getPayoutHistory,
    getPendingPayouts,
    getCompletedPayouts,
    getTotalEarnings,
    getEarningsSummary
} from "../controllers/payoutController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/payouts/history", sellerAuth, writeLimiter, getPayoutHistory);
router.get("/api/payouts/pending", sellerAuth, writeLimiter, getPendingPayouts);
router.get("/api/payouts/completed", sellerAuth, writeLimiter, getCompletedPayouts);
router.get("/api/payouts/total-earnings", sellerAuth, writeLimiter, getTotalEarnings);
router.get("/api/payouts/summary", sellerAuth, writeLimiter, getEarningsSummary);

export default router;
