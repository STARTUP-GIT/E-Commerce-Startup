import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getSettings,
    updateSettings,
    updateGST,
    updatePlatformFee,
    updatePackingRules,
    updatePaymentGateway,
    updateOrderSettings
} from "../controllers/settingsController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("settings.view"), getSettings);
router.patch("/", requirePermission("settings.manage"), updateSettings);
router.patch("/gst", requirePermission("settings.manage"), updateGST);
router.patch("/platform-fee", requirePermission("settings.manage"), updatePlatformFee);
router.patch("/packing-rules", requirePermission("settings.manage"), updatePackingRules);
router.patch("/payment-gateway", requirePermission("settings.manage"), updatePaymentGateway);
router.patch("/order-settings", requirePermission("settings.manage"), updateOrderSettings);

export default router;
