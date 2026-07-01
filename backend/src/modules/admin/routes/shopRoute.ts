import { Router } from "express";
import {
    getShops,
    getShop,
    deleteShop,
    approvePackingPermission,
    rejectPackingPermission,
    revokePackingPermission,
    activateShop,
    deactivateShop,
    banShop,
    unbanShop
} from "../controllers/shopController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = Router();

router.get("/shops", adminAuth, getShops);
router.get("/shops/:id", adminAuth, getShop);
router.delete("/shops/:id", adminAuth, deleteShop);
router.patch("/shops/:id/approve-packing", adminAuth, approvePackingPermission);
router.patch("/shops/:id/reject-packing", adminAuth, rejectPackingPermission);
router.patch("/shops/:id/revoke-packing", adminAuth, revokePackingPermission);
router.patch("/shops/:id/activate", adminAuth, activateShop);
router.patch("/shops/:id/deactivate", adminAuth, deactivateShop);
router.patch("/shops/:id/ban", adminAuth, banShop);
router.patch("/shops/:id/unban", adminAuth, unbanShop);

export default router;
