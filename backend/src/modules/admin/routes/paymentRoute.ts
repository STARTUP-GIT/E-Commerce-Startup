import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
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

router.get("/", getPayments);
router.get("/refunds", getRefunds);
router.get("/revenue", getPlatformRevenue);
router.get("/commissions", getSellerCommissionHistory);
router.get("/:id", getPayment);
router.patch("/:id/approve-refund", approveRefund);
router.patch("/:id/reject-refund", rejectRefund);

export default router;
