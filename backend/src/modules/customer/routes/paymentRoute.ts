import express from "express";
import {
    createPayment,
    verifyPayment,
    paymentWebhook,
    refundPayment
} from "../controllers/paymentController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";

const router = express.Router();

router.post("/api/payment/create", customerAuth, createPayment);
router.post("/api/payment/verify", customerAuth, verifyPayment);
router.post("/api/payment/refund", customerAuth, refundPayment);
router.post("/api/payment/webhook", paymentWebhook); // No authentication for webhook callback

export default router;
