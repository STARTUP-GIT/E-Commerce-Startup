import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getAdminLogs,
    getLoginHistory,
    getAuditLogs
} from "../controllers/logController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("audit_logs.view"), getAdminLogs);
router.get("/login-history", requirePermission("audit_logs.view"), getLoginHistory);
router.get("/audit", requirePermission("audit_logs.view"), getAuditLogs);

export default router;
