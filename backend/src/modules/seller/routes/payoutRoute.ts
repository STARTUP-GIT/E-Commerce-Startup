import express from "express";
import {
    getPayoutHistory,
    getPendingPayouts,
    getCompletedPayouts,
    getTotalEarnings,
    getEarningsSummary
} from "../controllers/payoutController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";

const router = express.Router();

router.get("/api/payouts/history", sellerAuth, getPayoutHistory);
router.get("/api/payouts/pending", sellerAuth, getPendingPayouts);
router.get("/api/payouts/completed", sellerAuth, getCompletedPayouts);
router.get("/api/payouts/total-earnings", sellerAuth, getTotalEarnings);
router.get("/api/payouts/summary", sellerAuth, getEarningsSummary);

export default router;
