import express from "express";
import {
    getCustomOrders,
    seeCustomOrder,
    acceptCustomOrder,
    rejectCustomOrder,
    sendQuotation,
    updateQuotation,
    deleteQuotation,
    uploadCustomOrderFiles
} from "../controllers/cuntomorderController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { writeLimiter, uploadLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/custom-orders", sellerAuth, writeLimiter, getCustomOrders);
router.get("/api/custom-orders/:orderId", sellerAuth, writeLimiter, seeCustomOrder);
router.patch("/api/custom-orders/:orderId/accept", sellerAuth, writeLimiter, acceptCustomOrder);
router.patch("/api/custom-orders/:orderId/reject", sellerAuth, writeLimiter, rejectCustomOrder);
router.post("/api/custom-orders/:orderId/quote", sellerAuth, writeLimiter, sendQuotation);
router.put("/api/custom-orders/:orderId/quote", sellerAuth, writeLimiter, updateQuotation);
router.delete("/api/custom-orders/:orderId/quote", sellerAuth, writeLimiter, deleteQuotation);
router.post("/api/custom-orders/:orderId/files", sellerAuth, uploadLimiter, uploadCustomOrderFiles);

export default router;
