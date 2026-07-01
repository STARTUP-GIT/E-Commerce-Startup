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

const router = express.Router();

router.get("/api/custom-orders", sellerAuth, getCustomOrders);
router.get("/api/custom-orders/:orderId", sellerAuth, seeCustomOrder);
router.patch("/api/custom-orders/:orderId/accept", sellerAuth, acceptCustomOrder);
router.patch("/api/custom-orders/:orderId/reject", sellerAuth, rejectCustomOrder);
router.post("/api/custom-orders/:orderId/quote", sellerAuth, sendQuotation);
router.put("/api/custom-orders/:orderId/quote", sellerAuth, updateQuotation);
router.delete("/api/custom-orders/:orderId/quote", sellerAuth, deleteQuotation);
router.post("/api/custom-orders/:orderId/files", sellerAuth, uploadCustomOrderFiles);

export default router;
