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
    updateShopConfig,
    getPackingFeeRequests
} from "../controllers/shopController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";

const router = Router();

router.use(adminAuth);

router.get("/shops", requirePermission("sellers.view"), getShops);
router.get("/packing-fee/requests", requirePermission("sellers.view"), getPackingFeeRequests);
router.get("/shops/:id", requirePermission("sellers.view"), getShop);
router.delete("/shops/:id", requirePermission("sellers.manage"), deleteShop);
router.patch("/shops/:id/approve-packing", requirePermission("sellers.manage"), approvePackingPermission);
router.patch("/shops/:id/reject-packing", requirePermission("sellers.manage"), rejectPackingPermission);
router.patch("/shops/:id/revoke-packing", requirePermission("sellers.manage"), revokePackingPermission);
router.patch("/shops/:id/approve", requirePermission("sellers.manage"), approveShop);
router.patch("/shops/:id/reject", requirePermission("sellers.manage"), rejectShop);
router.patch("/shops/:id/suspend", requirePermission("sellers.manage"), suspendShop);
router.patch("/shops/:id/disable", requirePermission("sellers.manage"), disableShop);
router.put("/shops/:id/config", requirePermission("sellers.manage"), updateShopConfig);

export default router;
