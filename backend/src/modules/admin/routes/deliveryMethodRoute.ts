import { Router } from "express";
import {
    getDeliveryMethods,
    createDeliveryMethod,
    updateDeliveryMethod,
    toggleDeliveryMethodStatus,
    deleteDeliveryMethod,
} from "../controllers/deliveryMethodController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("settings.view"), getDeliveryMethods);
router.post("/", requirePermission("settings.manage"), createDeliveryMethod);
router.put("/:id", requirePermission("settings.manage"), updateDeliveryMethod);
router.patch("/:id/status", requirePermission("settings.manage"), toggleDeliveryMethodStatus);
router.patch("/:id", requirePermission("settings.manage"), toggleDeliveryMethodStatus);
router.delete("/:id", requirePermission("settings.manage"), deleteDeliveryMethod);

export default router;
