import { Router } from "express";
import {
    getPaymentMethods,
    createPaymentMethod,
    updatePaymentMethod,
    togglePaymentMethodStatus,
    deletePaymentMethod
} from "../controllers/paymentMethodController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = Router();

router.get("/", adminAuth, getPaymentMethods);
router.post("/", adminAuth, createPaymentMethod);
router.put("/:id", adminAuth, updatePaymentMethod);
router.patch("/:id/status", adminAuth, togglePaymentMethodStatus);
router.patch("/:id", adminAuth, togglePaymentMethodStatus);
router.delete("/:id", adminAuth, deletePaymentMethod);

export default router;
