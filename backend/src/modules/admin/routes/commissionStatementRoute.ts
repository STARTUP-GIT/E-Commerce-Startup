import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getCommissionStatements,
    getCommissionStatementDetail,
    preparePeriodData,
    createCommissionStatement,
    publishCommissionStatement,
    recordCommissionPayment
} from "../controllers/commissionStatementController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("commissions.view", "payments.view"), getCommissionStatements);
router.get("/prepare", requirePermission("commissions.manage", "payments.manage"), preparePeriodData);
router.post("/", requirePermission("commissions.manage", "payments.manage"), createCommissionStatement);
router.get("/:id", requirePermission("commissions.view", "payments.view"), getCommissionStatementDetail);
router.post("/:id/publish", requirePermission("commissions.manage", "payments.manage"), publishCommissionStatement);
router.post("/payments", requirePermission("commissions.manage", "payments.manage"), recordCommissionPayment);

export default router;
