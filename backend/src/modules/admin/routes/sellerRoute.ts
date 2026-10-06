import { Router } from "express";
import {
    getSellers,
    getSeller,
    banSeller,
    unbanSeller,
    deleteSeller,
    getSellerShop,
    getSellerOrders,
    getSellerProducts,
    getSellerAnalytics,
    suspendSeller,
    restoreSeller,
    activateSeller,
    deactivateSeller
} from "../controllers/sellerController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";

const router = Router();

router.use(adminAuth);

router.get("/sellers", requirePermission("sellers.view"), getSellers);
router.get("/sellers/:id", requirePermission("sellers.view"), getSeller);
router.patch("/sellers/:id/ban", requirePermission("sellers.manage"), banSeller);
router.patch("/sellers/:id/unban", requirePermission("sellers.manage"), unbanSeller);
router.patch("/sellers/:id/suspend", requirePermission("sellers.manage"), suspendSeller);
router.patch("/sellers/:id/restore", requirePermission("sellers.manage"), restoreSeller);
router.patch("/sellers/:id/activate", requirePermission("sellers.manage"), activateSeller);
router.patch("/sellers/:id/deactivate", requirePermission("sellers.manage"), deactivateSeller);
router.delete("/sellers/:id", requirePermission("sellers.manage"), deleteSeller);
router.get("/sellers/:id/shop", requirePermission("sellers.view"), getSellerShop);
router.get("/sellers/:id/orders", requirePermission("sellers.view"), getSellerOrders);
router.get("/sellers/:id/products", requirePermission("sellers.view"), getSellerProducts);
router.get("/sellers/:id/analytics", requirePermission("sellers.view"), getSellerAnalytics);

export default router;
