import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import { getStrikes, createStrike, deactivateStrike } from "../controllers/sellerCenterController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("sellers.view"), getStrikes);
router.post("/", requirePermission("sellers.manage"), createStrike);
router.delete("/:id", requirePermission("sellers.manage"), deactivateStrike);

export default router;
