import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import { getReturns, approveReturn, rejectReturn } from "../controllers/returnController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("orders.view"), getReturns);
router.post("/:id/approve", requirePermission("orders.manage"), approveReturn);
router.post("/:id/reject", requirePermission("orders.manage"), rejectReturn);

export default router;
