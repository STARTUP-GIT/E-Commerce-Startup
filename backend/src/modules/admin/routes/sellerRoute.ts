import { Router } from "express";
import {
    getSellers,
    getSeller,
    approveSeller,
    rejectSeller,
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

const router = Router();

router.get("/sellers", adminAuth, getSellers);
router.get("/sellers/:id", adminAuth, getSeller);
router.patch("/sellers/:id/approve", adminAuth, approveSeller);
router.patch("/sellers/:id/reject", adminAuth, rejectSeller);
router.patch("/sellers/:id/ban", adminAuth, banSeller);
router.patch("/sellers/:id/unban", adminAuth, unbanSeller);
router.patch("/sellers/:id/suspend", adminAuth, suspendSeller);
router.patch("/sellers/:id/restore", adminAuth, restoreSeller);
router.patch("/sellers/:id/activate", adminAuth, activateSeller);
router.patch("/sellers/:id/deactivate", adminAuth, deactivateSeller);
router.delete("/sellers/:id", adminAuth, deleteSeller);
router.get("/sellers/:id/shop", adminAuth, getSellerShop);
router.get("/sellers/:id/orders", adminAuth, getSellerOrders);
router.get("/sellers/:id/products", adminAuth, getSellerProducts);
router.get("/sellers/:id/analytics", adminAuth, getSellerAnalytics);

export default router;
