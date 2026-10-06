import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getMe,
    getPermissionCatalog,
    listRoles,
    createRole,
    updateRole,
    deleteRole
} from "../controllers/rolesController.js";

const router = Router();

router.use(adminAuth);

router.get("/me", getMe);
router.get("/permissions", getPermissionCatalog);

router.use(requirePermission("admin.roles.manage"));

router.get("/", listRoles);
router.post("/", createRole);
router.patch("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;
