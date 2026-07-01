import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
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

router.get("/", getSettings);
router.patch("/", updateSettings);
router.patch("/gst", updateGST);
router.patch("/platform-fee", updatePlatformFee);
router.patch("/packing-rules", updatePackingRules);
router.patch("/payment-gateway", updatePaymentGateway);
router.patch("/order-settings", updateOrderSettings);

export default router;
