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
import { writeLimiter, uploadLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.post("/api/custom-orders", customerAuth, writeLimiter, createCustomOrder);
router.get("/api/custom-orders", customerAuth, writeLimiter, getCustomOrders);
router.get("/api/custom-orders/:id", customerAuth, writeLimiter, getCustomOrder);
router.delete("/api/custom-orders/:id", customerAuth, writeLimiter, cancelCustomOrder);
router.patch("/api/custom-orders/:id/accept-quotation", customerAuth, writeLimiter, acceptQuotation);
router.patch("/api/custom-orders/:id/reject-quotation", customerAuth, writeLimiter, rejectQuotation);
router.post("/api/custom-orders/:id/files", customerAuth, uploadLimiter, uploadAdditionalFiles);

export default router;
