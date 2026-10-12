import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getAppeals,
    getAppealDetail,
    assignAppealReviewer,
    requestMoreInfo,
    addInternalNote,
    recordAppealDecision
} from "../controllers/appealController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("appeals.view", "sellers.view"), getAppeals);
router.get("/:id", requirePermission("appeals.view", "sellers.view"), getAppealDetail);
router.post("/:id/assign", requirePermission("appeals.manage", "sellers.manage"), assignAppealReviewer);
router.post("/:id/request-info", requirePermission("appeals.manage", "sellers.manage"), requestMoreInfo);
router.post("/:id/notes", requirePermission("appeals.manage", "sellers.manage"), addInternalNote);
router.post("/:id/decision", requirePermission("appeals.manage", "sellers.manage"), recordAppealDecision);

export default router;
