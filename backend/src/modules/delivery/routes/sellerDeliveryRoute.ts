import express from "express";
import { markReadyForPickup, getAssignedDelivery, cancelPickup, getDeliveryHistory } from "../controllers/sellerDeliveryController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.patch("/api/seller/order/:id/ready", sellerAuth, writeLimiter, markReadyForPickup);
router.get("/api/seller/order/:id/delivery", sellerAuth, writeLimiter, getAssignedDelivery);
router.patch("/api/seller/order/:id/cancel-pickup", sellerAuth, writeLimiter, cancelPickup);
router.get("/api/seller/deliveries/history", sellerAuth, writeLimiter, getDeliveryHistory);

export default router;
