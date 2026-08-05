import { Router } from "express";
import {
  getCustomerLayout,
  getSellerLayout,
  getBranding,
  getPublicBranding,
  getCustomerNavbar,
  getCustomerHomepage,
  getSellerSidebar,
  getSellerWidgets,
  getPublicFeatures,
} from "../controllers/layoutController.js";
import { updateBranding } from "../controllers/settingsController.js";
import { platformAuth, requirePermission } from "../middleware/platformAuth.js";
import { PERMISSIONS } from "../utils/constants.js";

const router = Router();

// Public synchronization endpoints — accessible by Customer, Seller, Platform, and Admin apps
// Single source of truth branding endpoint (public, no authentication):
//   GET /api/platform/branding/public
//   GET /api/platform/public/branding
router.get("/branding/public", getPublicBranding);
router.get("/public/branding", getPublicBranding);
router.get("/public/layout/customer-navbar", getCustomerNavbar);
router.get("/public/layout/customer-homepage", getCustomerHomepage);
router.get("/public/layout/seller-sidebar", getSellerSidebar);
router.get("/public/layout/seller-widgets", getSellerWidgets);

router.get("/layout/customer", getCustomerLayout);
router.get("/layout/seller", getSellerLayout);
router.get("/branding", getBranding);
router.put("/branding", platformAuth, requirePermission(PERMISSIONS.MARKETPLACE_MANAGE), updateBranding);
router.patch("/branding", platformAuth, requirePermission(PERMISSIONS.MARKETPLACE_MANAGE), updateBranding);
router.get("/features", getPublicFeatures);

export default router;


