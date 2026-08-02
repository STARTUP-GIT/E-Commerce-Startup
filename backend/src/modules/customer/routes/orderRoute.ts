import express from "express";
import {
    getOrders,
    getOrder,
    cancelOrder,
    trackOrder,
    downloadInvoice,
    confirmDelivery
} from "../controllers/orderController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/orders", customerAuth, writeLimiter, getOrders);
router.get("/api/orders/:orderId", customerAuth, writeLimiter, getOrder);
router.patch("/api/orders/:orderId/cancel", customerAuth, writeLimiter, cancelOrder);
router.get("/api/orders/:orderId/track", customerAuth, writeLimiter, trackOrder);
router.get("/api/orders/:orderId/invoice", customerAuth, writeLimiter, downloadInvoice);
router.patch("/api/orders/seller-order/:sellerOrderId/confirm", customerAuth, writeLimiter, confirmDelivery);

export default router;
