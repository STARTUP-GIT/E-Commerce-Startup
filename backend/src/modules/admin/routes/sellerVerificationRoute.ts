import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import { getVerifications, reviewVerification } from "../controllers/sellerCenterController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("sellers.view"), getVerifications);
router.patch("/:id", requirePermission("sellers.manage"), reviewVerification);

export default router;
