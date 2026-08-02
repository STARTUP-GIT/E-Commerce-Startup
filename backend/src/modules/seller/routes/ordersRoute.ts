import express from "express";
import {
    getOrders,
    seeOrders,
    acceptOrders,
    rejectOrders,
    setReadyTime,
    uploadPackingProof,
    markPacked,
    markShipped,
    markDelivered,
    getOrderTimeline,
    markCodCollected,
    assignDeliveryMethod,
    getAllowedDeliveryMethods,
    downloadShippingLabel,
    downloadInvoice,
} from "../controllers/ordersController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { writeLimiter, uploadLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/orders", sellerAuth, writeLimiter, getOrders);
router.get("/api/orders/allowed-delivery-methods", sellerAuth, writeLimiter, getAllowedDeliveryMethods);
router.get("/api/orders/:orderId", sellerAuth, writeLimiter, seeOrders);
router.patch("/api/orders/:orderId/accept", sellerAuth, writeLimiter, acceptOrders);
router.patch("/api/orders/:orderId/reject", sellerAuth, writeLimiter, rejectOrders);
router.patch("/api/orders/:orderId/ready-time", sellerAuth, writeLimiter, setReadyTime);
router.patch("/api/orders/:orderId/delivery-method", sellerAuth, writeLimiter, assignDeliveryMethod);
router.post("/api/orders/:orderId/packing-proof", sellerAuth, uploadLimiter, uploadPackingProof);
router.patch("/api/orders/:orderId/packed", sellerAuth, writeLimiter, markPacked);
router.patch("/api/orders/:orderId/shipped", sellerAuth, writeLimiter, markShipped);
router.patch("/api/orders/:orderId/delivered", sellerAuth, writeLimiter, markDelivered);
router.patch("/api/orders/:orderId/mark-cod-collected", sellerAuth, writeLimiter, markCodCollected);
router.get("/api/orders/:orderId/timeline", sellerAuth, writeLimiter, getOrderTimeline);
router.get("/api/orders/:orderId/shipping-label", sellerAuth, writeLimiter, downloadShippingLabel);
router.get("/api/orders/:orderId/invoice", sellerAuth, writeLimiter, downloadInvoice);

export default router;