import { Router } from "express";
import {
  getCustomerLayout,
  getSellerLayout,
  getBranding,
  getPublicFeatures,
} from "../controllers/layoutController.js";
import { updateBranding } from "../controllers/settingsController.js";
import { platformAuth, requirePermission } from "../middleware/platformAuth.js";
import { PERMISSIONS } from "../utils/constants.js";

const router = Router();

// Public synchronization endpoints — accessible by Customer, Seller, Platform, and Admin apps
router.get("/layout/customer", getCustomerLayout);
router.get("/layout/seller", getSellerLayout);
router.get("/branding", getBranding);
router.put("/branding", platformAuth, requirePermission(PERMISSIONS.MARKETPLACE_MANAGE), updateBranding);
router.patch("/branding", platformAuth, requirePermission(PERMISSIONS.MARKETPLACE_MANAGE), updateBranding);
router.get("/features", getPublicFeatures);

export default router;

