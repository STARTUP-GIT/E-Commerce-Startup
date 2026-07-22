import { Router } from "express";
import {
    getDeliveryMethods,
    createDeliveryMethod,
    updateDeliveryMethod,
    toggleDeliveryMethodStatus,
    deleteDeliveryMethod,
} from "../controllers/deliveryMethodController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = Router();

router.get("/", adminAuth, getDeliveryMethods);
router.post("/", adminAuth, createDeliveryMethod);
router.put("/:id", adminAuth, updateDeliveryMethod);
router.patch("/:id/status", adminAuth, toggleDeliveryMethodStatus);
router.patch("/:id", adminAuth, toggleDeliveryMethodStatus);
router.delete("/:id", adminAuth, deleteDeliveryMethod);

export default router;
