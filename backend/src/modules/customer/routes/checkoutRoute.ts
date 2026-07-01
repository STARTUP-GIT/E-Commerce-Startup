import express from "express";
import {
    checkout,
    applyCoupon,
    removeCoupon,
    calculateShipping,
    calculateTaxes,
    validateCheckout
} from "../controllers/checkoutController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";

const router = express.Router();

router.post("/api/checkout", customerAuth, checkout);
router.post("/api/checkout/apply-coupon", customerAuth, applyCoupon);
router.post("/api/checkout/remove-coupon", customerAuth, removeCoupon);
router.get("/api/checkout/shipping", customerAuth, calculateShipping);
router.post("/api/checkout/taxes", customerAuth, calculateTaxes);
router.get("/api/checkout/validate", customerAuth, validateCheckout);

export default router;
