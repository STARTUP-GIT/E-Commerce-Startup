import express from "express";
import {
    createCustomOrder,
    getCustomOrders,
    getCustomOrder,
    cancelCustomOrder,
    acceptQuotation,
    rejectQuotation,
    uploadAdditionalFiles
} from "../controllers/customOrderController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";

const router = express.Router();

router.post("/api/custom-orders", customerAuth, createCustomOrder);
router.get("/api/custom-orders", customerAuth, getCustomOrders);
router.get("/api/custom-orders/:id", customerAuth, getCustomOrder);
router.delete("/api/custom-orders/:id", customerAuth, cancelCustomOrder);
router.patch("/api/custom-orders/:id/accept-quotation", customerAuth, acceptQuotation);
router.patch("/api/custom-orders/:id/reject-quotation", customerAuth, rejectQuotation);
router.post("/api/custom-orders/:id/files", customerAuth, uploadAdditionalFiles);

export default router;
