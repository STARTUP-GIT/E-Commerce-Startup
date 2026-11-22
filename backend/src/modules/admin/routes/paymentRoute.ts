import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import { adminFinancialLimiter } from "../../../middleware/rateLimiter.js";
import {
    getPayments,
    getPayment,
    getRefunds,
    approveRefund,
    rejectRefund,
    getPlatformRevenue,
    getSellerCommissionHistory
} from "../controllers/paymentController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("payments.view"), getPayments);
router.get("/refunds", requirePermission("payments.view"), getRefunds);
router.get("/revenue", requirePermission("payments.view"), getPlatformRevenue);
router.get("/commissions", requirePermission("payments.view"), getSellerCommissionHistory);
router.get("/:id", requirePermission("payments.view"), getPayment);
router.patch("/:id/approve-refund", adminFinancialLimiter, requirePermission("payments.refund"), approveRefund);
router.patch("/:id/reject-refund", adminFinancialLimiter, requirePermission("payments.refund"), rejectRefund);

export default router;
