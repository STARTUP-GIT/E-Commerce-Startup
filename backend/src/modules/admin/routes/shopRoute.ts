import { Router } from "express";
import {
    getShops,
    getShop,
    deleteShop,
    approvePackingPermission,
    rejectPackingPermission,
    revokePackingPermission,
    approveShop,
    rejectShop,
    suspendShop,
    disableShop,
    updateShopConfig
} from "../controllers/shopController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = Router();

router.get("/shops", adminAuth, getShops);
router.get("/shops/:id", adminAuth, getShop);
router.delete("/shops/:id", adminAuth, deleteShop);
router.patch("/shops/:id/approve-packing", adminAuth, approvePackingPermission);
router.patch("/shops/:id/reject-packing", adminAuth, rejectPackingPermission);
router.patch("/shops/:id/revoke-packing", adminAuth, revokePackingPermission);
router.patch("/shops/:id/approve", adminAuth, approveShop);
router.patch("/shops/:id/reject", adminAuth, rejectShop);
router.patch("/shops/:id/suspend", adminAuth, suspendShop);
router.patch("/shops/:id/disable", adminAuth, disableShop);
router.put("/shops/:id/config", adminAuth, updateShopConfig);

export default router;
