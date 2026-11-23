import express from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";
import {
    getAdminPackagingOptions,
    approvePackagingOption,
    rejectPackagingOption,
    requestChangesPackagingOption,
    suspendPackagingOption
} from "../controllers/packagingController.js";

const router = express.Router();

router.use(adminAuth);

router.get("/", requirePermission("sellers.view"), getAdminPackagingOptions);
router.patch("/:id/approve", requirePermission("sellers.manage"), writeLimiter, approvePackagingOption);
router.patch("/:id/reject", requirePermission("sellers.manage"), writeLimiter, rejectPackagingOption);
router.patch("/:id/request-changes", requirePermission("sellers.manage"), writeLimiter, requestChangesPackagingOption);
router.patch("/:id/suspend", requirePermission("sellers.manage"), writeLimiter, suspendPackagingOption);

export default router;
