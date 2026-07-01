import express from "express";
import { markReadyForPickup, getAssignedDelivery, cancelPickup, getDeliveryHistory } from "../controllers/sellerDeliveryController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";

const router = express.Router();

router.patch("/api/seller/order/:id/ready", sellerAuth, markReadyForPickup);
router.get("/api/seller/order/:id/delivery", sellerAuth, getAssignedDelivery);
router.patch("/api/seller/order/:id/cancel-pickup", sellerAuth, cancelPickup);
router.get("/api/seller/deliveries/history", sellerAuth, getDeliveryHistory);

export default router;
