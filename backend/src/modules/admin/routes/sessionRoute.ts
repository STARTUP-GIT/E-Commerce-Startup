import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import { getSessions, revokeSession } from "../controllers/sessionController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("sessions.view"), getSessions);
router.delete("/:id", requirePermission("sessions.manage"), revokeSession);

export default router;
