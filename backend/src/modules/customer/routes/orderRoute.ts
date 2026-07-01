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

const router = express.Router();

router.get("/api/orders", customerAuth, getOrders);
router.get("/api/orders/:orderId", customerAuth, getOrder);
router.patch("/api/orders/:orderId/cancel", customerAuth, cancelOrder);
router.get("/api/orders/:orderId/track", customerAuth, trackOrder);
router.get("/api/orders/:orderId/invoice", customerAuth, downloadInvoice);
router.patch("/api/orders/seller-order/:sellerOrderId/confirm", customerAuth, confirmDelivery);

export default router;
