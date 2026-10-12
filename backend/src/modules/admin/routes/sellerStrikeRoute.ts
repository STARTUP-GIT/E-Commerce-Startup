import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getEnforcements,
    issueEnforcement,
    getEnforcementDetail,
    updateEnforcementStatus
} from "../controllers/enforcementController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("enforcement.view", "sellers.view"), getEnforcements);
router.post("/", requirePermission("enforcement.strike", "enforcement.warning", "sellers.manage"), issueEnforcement);
router.get("/:id", requirePermission("enforcement.view", "sellers.view"), getEnforcementDetail);
router.patch("/:id/status", requirePermission("enforcement.strike", "enforcement.warning", "sellers.manage"), updateEnforcementStatus);
router.delete("/:id", requirePermission("enforcement.strike", "enforcement.warning", "sellers.manage"), (req, res) => {
    req.body = { status: "WITHDRAWN", reason: "Deactivated / Withdrawn by administrator" };
    return updateEnforcementStatus(req, res);
});

export default router;
