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
    getOrderTimeline
} from "../controllers/ordersController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";

const router = express.Router();

router.get("/api/orders", sellerAuth, getOrders);
router.get("/api/orders/:orderId", sellerAuth, seeOrders);
router.patch("/api/orders/:orderId/accept", sellerAuth, acceptOrders);
router.patch("/api/orders/:orderId/reject", sellerAuth, rejectOrders);
router.patch("/api/orders/:orderId/ready-time", sellerAuth, setReadyTime);
router.post("/api/orders/:orderId/packing-proof", sellerAuth, uploadPackingProof);
router.patch("/api/orders/:orderId/packed", sellerAuth, markPacked);
router.patch("/api/orders/:orderId/shipped", sellerAuth, markShipped);
router.patch("/api/orders/:orderId/delivered", sellerAuth, markDelivered);
router.get("/api/orders/:orderId/timeline", sellerAuth, getOrderTimeline);

export default router;