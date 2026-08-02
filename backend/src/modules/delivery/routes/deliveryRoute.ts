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
import { writeLimiter, uploadLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.post("/api/delivery/create", adminAuth, writeLimiter, validateCreateDelivery, createDelivery);
router.get("/api/delivery/:id", adminAuth, writeLimiter, getDelivery);
router.get("/api/deliveries", adminAuth, writeLimiter, getDeliveries);
router.get("/api/delivery/track/:id", polymorphicAuth, writeLimiter, trackDelivery);
router.patch("/api/delivery/:id/assign", adminAuth, writeLimiter, validateAssignDriver, assignDeliveryPartner);
router.patch("/api/delivery/:id/status", adminAuth, writeLimiter, validateUpdateStatus, updateDeliveryStatus);
router.patch("/api/delivery/pickup", adminAuth, writeLimiter, validatePickup, markPickedUp);
router.patch("/api/delivery/out-for-delivery", adminAuth, writeLimiter, validatePickup, markOutForDelivery);
router.patch("/api/delivery/delivered", adminAuth, writeLimiter, validatePickup, markDelivered);
router.post("/api/delivery/proof", adminAuth, uploadLimiter, validateProof, uploadDeliveryProof);
router.get("/api/delivery/:id/timeline", polymorphicAuth, writeLimiter, getDeliveryTimeline);
router.post("/api/delivery/calculate", adminAuth, writeLimiter, validateCalculate, calculateDeliveryCharge);

export default router;
