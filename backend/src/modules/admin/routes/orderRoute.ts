import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import {
    getOrders,
    getOrder,
    getSellerOrders,
    updateOrderStatus,
    cancelOrder,
    refundOrder,
    getOrderTimeline
} from "../controllers/orderController.js";

const router = Router();

router.use(adminAuth);

router.get("/", getOrders);
router.get("/seller-orders", getSellerOrders);
router.get("/:id", getOrder);
router.get("/:id/timeline", getOrderTimeline);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/cancel", cancelOrder);
router.patch("/:id/refund", refundOrder);

export default router;
