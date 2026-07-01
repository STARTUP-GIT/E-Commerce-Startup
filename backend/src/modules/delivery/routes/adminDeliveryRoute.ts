import express from "express";
import {
  getAllDeliveries,
  getDelivery,
  cancelDelivery,
  reassignDelivery,
  deliveryAnalytics,
  getLiveDeliveries,
  changeDeliveryShare,
  changeDeliveryProvider
} from "../controllers/adminDeliveryController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = express.Router();

router.get("/deliveries", adminAuth, getAllDeliveries);
router.get("/deliveries/:id", adminAuth, getDelivery);
router.patch("/deliveries/:id/cancel", adminAuth, cancelDelivery);
router.patch("/deliveries/:id/reassign", adminAuth, reassignDelivery);
router.get("/deliveries/analytics", adminAuth, deliveryAnalytics);
router.get("/deliveries/live", adminAuth, getLiveDeliveries);
router.patch("/delivery-share", adminAuth, changeDeliveryShare);
router.patch("/delivery-provider", adminAuth, changeDeliveryProvider);

export default router;
