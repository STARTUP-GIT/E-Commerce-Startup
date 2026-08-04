import express from "express";
import {
    checkout,
    applyCoupon,
    removeCoupon,
    calculateShipping,
    calculateTaxes,
    validateCheckout,
    getEnabledPaymentMethods,
    getEnabledDeliveryMethods,
    checkoutCod
} from "../controllers/checkoutController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";
import { checkoutLimiter, publicReadLimiter } from "../../../middleware/rateLimiter.js";
import { cache } from "../../../middleware/cache.js";
import { requireFeature } from "../../../middleware/featureGuard.js";

const router = express.Router();

router.get("/api/checkout/payment-methods", publicReadLimiter, cache(120), getEnabledPaymentMethods);
router.get("/api/checkout/delivery-methods", publicReadLimiter, cache(120), getEnabledDeliveryMethods);
router.post("/api/checkout/cod", customerAuth, requireFeature("BUY_NOW", "CUSTOMER"), checkoutLimiter, checkoutCod);
router.post("/api/checkout", customerAuth, requireFeature("BUY_NOW", "CUSTOMER"), checkoutLimiter, checkout);
router.post("/api/checkout/apply-coupon", customerAuth, requireFeature("COUPONS", "CUSTOMER"), checkoutLimiter, applyCoupon);
router.post("/api/checkout/remove-coupon", customerAuth, checkoutLimiter, removeCoupon);
router.get("/api/checkout/shipping", customerAuth, calculateShipping);
router.post("/api/checkout/taxes", customerAuth, checkoutLimiter, calculateTaxes);
router.get("/api/checkout/validate", customerAuth, validateCheckout);

export default router;
