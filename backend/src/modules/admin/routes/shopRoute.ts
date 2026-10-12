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
    getPackingFeeRequests,
    issueShopAgreement,
    getAllAgreements
} from "../controllers/shopController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";

const router = Router();

router.use(adminAuth);

// Shop list and agreements
router.get("/shops", requirePermission("sellers.view"), getShops);
router.get("/", requirePermission("sellers.view"), getShops);
router.get("/agreements", requirePermission("sellers.view"), getAllAgreements);
router.get("/shops/agreements", requirePermission("sellers.view"), getAllAgreements);
router.get("/packing-fee/requests", requirePermission("sellers.view"), getPackingFeeRequests);

// Detail and mutations
router.get("/shops/:id", requirePermission("sellers.view"), getShop);
router.get("/:id", requirePermission("sellers.view"), getShop);
router.post("/shops/:id/issue-agreement", requirePermission("sellers.manage"), issueShopAgreement);
router.post("/:id/issue-agreement", requirePermission("sellers.manage"), issueShopAgreement);
router.delete("/shops/:id", requirePermission("sellers.manage"), deleteShop);
router.delete("/:id", requirePermission("sellers.manage"), deleteShop);
router.patch("/shops/:id/approve-packing", requirePermission("sellers.manage"), approvePackingPermission);
router.patch("/:id/approve-packing", requirePermission("sellers.manage"), approvePackingPermission);
router.patch("/shops/:id/reject-packing", requirePermission("sellers.manage"), rejectPackingPermission);
router.patch("/:id/reject-packing", requirePermission("sellers.manage"), rejectPackingPermission);
router.patch("/shops/:id/revoke-packing", requirePermission("sellers.manage"), revokePackingPermission);
router.patch("/:id/revoke-packing", requirePermission("sellers.manage"), revokePackingPermission);
router.patch("/shops/:id/approve", requirePermission("sellers.manage"), approveShop);
router.patch("/:id/approve", requirePermission("sellers.manage"), approveShop);
router.patch("/shops/:id/reject", requirePermission("sellers.manage"), rejectShop);
router.patch("/:id/reject", requirePermission("sellers.manage"), rejectShop);
router.patch("/shops/:id/suspend", requirePermission("sellers.manage"), suspendShop);
router.patch("/:id/suspend", requirePermission("sellers.manage"), suspendShop);
router.patch("/shops/:id/disable", requirePermission("sellers.manage"), disableShop);
router.patch("/:id/disable", requirePermission("sellers.manage"), disableShop);
router.put("/shops/:id/config", requirePermission("sellers.manage"), updateShopConfig);
router.put("/:id/config", requirePermission("sellers.manage"), updateShopConfig);

export default router;

