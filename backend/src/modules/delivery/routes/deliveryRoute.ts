import express from "express";
import {
  createDelivery,
  cancelDelivery,
  getDelivery,
  getDeliveries,
  trackDelivery,
  assignDeliveryPartner,
  updateDeliveryStatus,
  markPickedUp,
  markOutForDelivery,
  markDelivered,
  uploadDeliveryProof,
  getDeliveryTimeline,
  calculateDeliveryCharge
} from "../controllers/deliveryController.js";
import {
  validateCreateDelivery,
  validateAssignDriver,
  validateUpdateStatus,
  validatePickup,
  validateProof,
  validateCalculate
} from "../validators/deliveryValidator.js";
import { customerAuth } from "../../../middleware/customerAuth.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { polymorphicAuth } from "../../../middleware/polymorphicAuth.js";

const router = express.Router();

router.post("/api/delivery/create", adminAuth, validateCreateDelivery, createDelivery);
router.get("/api/delivery/:id", adminAuth, getDelivery);
router.get("/api/deliveries", adminAuth, getDeliveries);
router.get("/api/delivery/track/:id", polymorphicAuth, trackDelivery);
router.patch("/api/delivery/:id/assign", adminAuth, validateAssignDriver, assignDeliveryPartner);
router.patch("/api/delivery/:id/status", adminAuth, validateUpdateStatus, updateDeliveryStatus);
router.patch("/api/delivery/pickup", adminAuth, validatePickup, markPickedUp);
router.patch("/api/delivery/out-for-delivery", adminAuth, validatePickup, markOutForDelivery);
router.patch("/api/delivery/delivered", adminAuth, validatePickup, markDelivered);
router.post("/api/delivery/proof", adminAuth, validateProof, uploadDeliveryProof);
router.get("/api/delivery/:id/timeline", polymorphicAuth, getDeliveryTimeline);
router.post("/api/delivery/calculate", adminAuth, validateCalculate, calculateDeliveryCharge);

export default router;
