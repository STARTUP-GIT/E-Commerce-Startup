import { Router } from "express";
import { getBackups, addBackup, removeBackup } from "../controllers/backupController.js";
import { platformAuth, requirePermission } from "../middleware/platformAuth.js";
import { PERMISSIONS } from "../utils/constants.js";

const router = Router();

router.get("/", platformAuth, requirePermission(PERMISSIONS.BACKUPS_MANAGE), getBackups);
router.post("/", platformAuth, requirePermission(PERMISSIONS.BACKUPS_MANAGE), addBackup);
router.delete("/:id", platformAuth, requirePermission(PERMISSIONS.BACKUPS_MANAGE), removeBackup);

export default router;
