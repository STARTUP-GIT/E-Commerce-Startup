import { Router } from "express";
import { getHealth, getOverview, getLogs, getAuditLogs, getCache } from "../controllers/monitoringController.js";
import { platformAuth, requirePermission } from "../middleware/platformAuth.js";
import { PERMISSIONS } from "../utils/constants.js";

const router = Router();

router.get("/health", platformAuth, requirePermission(PERMISSIONS.MONITORING_VIEW), getHealth);
router.get("/overview", platformAuth, requirePermission(PERMISSIONS.DASHBOARD_VIEW), getOverview);
router.get("/logs", platformAuth, requirePermission(PERMISSIONS.LOGS_VIEW), getLogs);
router.get("/audit-logs", platformAuth, requirePermission(PERMISSIONS.AUDIT_VIEW), getAuditLogs);
router.get("/cache", platformAuth, requirePermission(PERMISSIONS.MONITORING_VIEW), getCache);

export default router;
