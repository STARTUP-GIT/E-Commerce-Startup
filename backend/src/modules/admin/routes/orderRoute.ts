import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
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

router.get("/", requirePermission("orders.view"), getOrders);
router.get("/seller-orders", requirePermission("orders.view"), getSellerOrders);
router.get("/:id", requirePermission("orders.view"), getOrder);
router.get("/:id/timeline", requirePermission("orders.view"), getOrderTimeline);
router.patch("/:id/status", requirePermission("orders.manage"), updateOrderStatus);
router.patch("/:id/cancel", requirePermission("orders.manage"), cancelOrder);
router.patch("/:id/refund", requirePermission("orders.manage"), refundOrder);

export default router;
