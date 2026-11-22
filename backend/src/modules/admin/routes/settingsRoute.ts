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
import {
    getIndianGstConfiguration,
    updateIndianGstMasterConfig,
    updateBusinessGstRegistration,
    createHsnClassification,
    updateHsnClassification,
    getTcsLedger
} from "../controllers/gstSettingsController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("settings.view"), getSettings);
router.patch("/", requirePermission("settings.manage"), updateSettings);
router.patch("/gst", requirePermission("settings.manage"), updateGST);
router.patch("/platform-fee", requirePermission("settings.manage"), updatePlatformFee);
router.patch("/packing-rules", requirePermission("settings.manage"), updatePackingRules);
router.patch("/payment-gateway", requirePermission("settings.manage"), updatePaymentGateway);
router.patch("/order-settings", requirePermission("settings.manage"), updateOrderSettings);

// Indian GST Architecture Routes
router.get("/gst-config", requirePermission("settings.view"), getIndianGstConfiguration);
router.patch("/gst/master", requirePermission("settings.manage"), updateIndianGstMasterConfig);
router.patch("/gst/business-registration", requirePermission("settings.manage"), updateBusinessGstRegistration);
router.post("/gst/hsn", requirePermission("settings.manage"), createHsnClassification);
router.patch("/gst/hsn/:id", requirePermission("settings.manage"), updateHsnClassification);
router.get("/gst/tcs-ledger", requirePermission("settings.view"), getTcsLedger);

export default router;
