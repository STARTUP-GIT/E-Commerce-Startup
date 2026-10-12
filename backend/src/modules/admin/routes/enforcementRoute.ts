import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getEnforcements,
    getEnforcementDetail,
    issueEnforcement,
    updateEnforcementStatus,
    directSuspendSeller,
    reinstateSeller,
    getSellerEnforcementHistory
} from "../controllers/enforcementController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("enforcement.view", "sellers.view"), getEnforcements);
router.post("/", requirePermission("enforcement.manage", "sellers.manage"), issueEnforcement);
router.get("/:id", requirePermission("enforcement.view", "sellers.view"), getEnforcementDetail);
router.patch("/:id/status", requirePermission("enforcement.manage", "sellers.manage"), updateEnforcementStatus);
router.post("/direct-suspension", requirePermission("enforcement.manage", "sellers.manage"), directSuspendSeller);
router.post("/reinstatement", requirePermission("enforcement.manage", "sellers.manage"), reinstateSeller);
router.get("/seller/:sellerId/history", requirePermission("enforcement.view", "sellers.view"), getSellerEnforcementHistory);

export default router;
