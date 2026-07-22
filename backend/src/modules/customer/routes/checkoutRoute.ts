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

const router = express.Router();

router.get("/api/checkout/payment-methods", getEnabledPaymentMethods);
router.get("/api/checkout/delivery-methods", getEnabledDeliveryMethods);
router.post("/api/checkout/cod", customerAuth, checkoutCod);
router.post("/api/checkout", customerAuth, checkout);
router.post("/api/checkout/apply-coupon", customerAuth, applyCoupon);
router.post("/api/checkout/remove-coupon", customerAuth, removeCoupon);
router.get("/api/checkout/shipping", customerAuth, calculateShipping);
router.post("/api/checkout/taxes", customerAuth, calculateTaxes);
router.get("/api/checkout/validate", customerAuth, validateCheckout);

export default router;
