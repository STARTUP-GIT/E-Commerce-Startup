import { Router } from "express";
import { adminLimiter } from "../../../middleware/rateLimiter.js";
import authRoute from "./authRoute.js";
import featureFlagRoute from "./featureFlagRoute.js";
import settingsRoute from "./settingsRoute.js";
import monitoringRoute from "./monitoringRoute.js";
import securityRoute from "./securityRoute.js";
import releaseRoute from "./releaseRoute.js";
import webhookRoute from "./webhookRoute.js";
import backupRoute from "./backupRoute.js";
import queueRoute from "./queueRoute.js";

const router = Router();

router.use(adminLimiter);

router.use("/auth", authRoute);
router.use("/feature-flags", featureFlagRoute);
router.use("/settings", settingsRoute);
router.use("/monitoring", monitoringRoute);
router.use("/security", securityRoute);
router.use("/release", releaseRoute);
router.use("/webhooks", webhookRoute);
router.use("/backups", backupRoute);
router.use("/queues", queueRoute);

export default router;
