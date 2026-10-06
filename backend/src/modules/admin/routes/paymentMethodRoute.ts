import { Router } from "express";
import {
    getPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    togglePaymentMethodStatus,
    deletePaymentMethod
} from "../controllers/paymentMethodController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("settings.view"), getPaymentMethods);
router.post("/", requirePermission("settings.manage"), createPaymentMethod);
router.put("/:id", requirePermission("settings.manage"), updatePaymentMethod);
router.patch("/:id/status", requirePermission("settings.manage"), togglePaymentMethodStatus);
router.patch("/:id", requirePermission("settings.manage"), togglePaymentMethodStatus);
router.delete("/:id", requirePermission("settings.manage"), deletePaymentMethod);

export default router;
