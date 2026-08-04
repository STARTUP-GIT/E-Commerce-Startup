import { Router } from "express";
import {
  getSettings,
  updateMarketplace,
  updateCommission,
  updateMaintenance,
  updatePaymentProviders,
  updateStorage,
  updateEmailProviders,
  updateOAuthProviders,
  updateRazorpay,
  updateBranding,
  updateUiLayout,
} from "../controllers/settingsController.js";
import { platformAuth, requirePermission } from "../middleware/platformAuth.js";
import { PERMISSIONS } from "../utils/constants.js";

const router = Router();

router.get("/", platformAuth, requirePermission(PERMISSIONS.MARKETPLACE_VIEW), getSettings);
router.patch("/branding", platformAuth, requirePermission(PERMISSIONS.MARKETPLACE_MANAGE), updateBranding);
router.patch("/ui-layout", platformAuth, requirePermission(PERMISSIONS.MARKETPLACE_MANAGE), updateUiLayout);
router.patch("/marketplace", platformAuth, requirePermission(PERMISSIONS.MARKETPLACE_MANAGE), updateMarketplace);
router.patch("/commission", platformAuth, requirePermission(PERMISSIONS.COMMISSION_MANAGE), updateCommission);
router.patch("/maintenance", platformAuth, requirePermission(PERMISSIONS.MAINTENANCE_MANAGE), updateMaintenance);
router.patch("/payment-providers", platformAuth, requirePermission(PERMISSIONS.PAYMENT_PROVIDERS_MANAGE), updatePaymentProviders);
router.patch("/storage", platformAuth, requirePermission(PERMISSIONS.STORAGE_MANAGE), updateStorage);
router.patch("/email-providers", platformAuth, requirePermission(PERMISSIONS.EMAIL_PROVIDERS_MANAGE), updateEmailProviders);
router.patch("/oauth-providers", platformAuth, requirePermission(PERMISSIONS.OAUTH_MANAGE), updateOAuthProviders);
router.patch("/razorpay", platformAuth, requirePermission(PERMISSIONS.PAYMENTS_MANAGE), updateRazorpay);

export default router;
