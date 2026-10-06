import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import { getPayouts, updatePayout } from "../controllers/sellerCenterController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("payments.view"), getPayouts);
router.patch("/:id", requirePermission("payments.refund"), updatePayout);

export default router;
