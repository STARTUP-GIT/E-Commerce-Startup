import express from "express";
import {
    createPayment,
    verifyPayment,
    paymentWebhook,
    refundPayment
} from "../controllers/paymentController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";
import { paymentLimiter, webhookLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.post("/api/payment/create", customerAuth, paymentLimiter, createPayment);
router.post("/api/payment/verify", customerAuth, paymentLimiter, verifyPayment);
router.post("/api/payment/refund", customerAuth, paymentLimiter, refundPayment);
router.post("/api/payment/webhook", webhookLimiter, paymentWebhook); // No authentication for webhook callback

export default router;
