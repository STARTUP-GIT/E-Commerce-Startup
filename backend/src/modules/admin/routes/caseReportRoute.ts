import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getCaseReports,
    getCaseReportDetail,
    addCaseTimelineEvent,
    resolveCaseReport
} from "../controllers/caseReportController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("cases.view", "reports.view"), getCaseReports);
router.get("/:id", requirePermission("cases.view", "reports.view"), getCaseReportDetail);
router.post("/:id/timeline", requirePermission("cases.manage", "reports.view"), addCaseTimelineEvent);
router.post("/:id/resolve", requirePermission("cases.manage", "reports.view"), resolveCaseReport);

export default router;
