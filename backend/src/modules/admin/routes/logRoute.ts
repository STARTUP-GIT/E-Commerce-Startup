import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import {
    getAdminLogs,
    getLoginHistory,
    getAuditLogs
} from "../controllers/logController.js";

const router = Router();

router.use(adminAuth);

router.get("/", getAdminLogs);
router.get("/login-history", getLoginHistory);
router.get("/audit", getAuditLogs);

export default router;
