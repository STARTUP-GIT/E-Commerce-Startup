import { Router } from "express";
import {
  getCustomerLayout,
  getSellerLayout,
  getBranding,
  getPublicFeatures,
} from "../controllers/layoutController.js";

const router = Router();

// Public synchronization endpoints — accessible by Customer, Seller, Platform, and Admin apps
router.get("/layout/customer", getCustomerLayout);
router.get("/layout/seller", getSellerLayout);
router.get("/branding", getBranding);
router.get("/features", getPublicFeatures);

export default router;
