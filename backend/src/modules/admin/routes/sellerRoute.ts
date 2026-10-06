import { Router } from "express";
import {
    getSellers,
    getSeller,
    searchSellers,
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

router.get("/search", requirePermission("sellers.manage"), searchSellers);
router.get("/", requirePermission("sellers.view"), getSellers);
router.get("/:id", requirePermission("sellers.view"), getSeller);
router.patch("/:id/ban", requirePermission("sellers.manage"), banSeller);
router.patch("/:id/unban", requirePermission("sellers.manage"), unbanSeller);
router.patch("/:id/suspend", requirePermission("sellers.manage"), suspendSeller);
router.patch("/:id/restore", requirePermission("sellers.manage"), restoreSeller);
router.patch("/:id/activate", requirePermission("sellers.manage"), activateSeller);
router.patch("/:id/deactivate", requirePermission("sellers.manage"), deactivateSeller);
router.delete("/:id", requirePermission("sellers.manage"), deleteSeller);
router.get("/:id/shop", requirePermission("sellers.view"), getSellerShop);
router.get("/:id/orders", requirePermission("sellers.view"), getSellerOrders);
router.get("/:id/products", requirePermission("sellers.view"), getSellerProducts);
router.get("/:id/analytics", requirePermission("sellers.view"), getSellerAnalytics);

export default router;
