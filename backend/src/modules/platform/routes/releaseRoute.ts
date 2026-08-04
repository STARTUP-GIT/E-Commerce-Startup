import { Router } from "express";
import { getVersions, addVersion, patchVersion, removeVersion } from "../controllers/releaseController.js";
import { platformAuth, requirePermission } from "../middleware/platformAuth.js";
import { PERMISSIONS } from "../utils/constants.js";

const router = Router();

router.get("/versions", platformAuth, requirePermission(PERMISSIONS.RELEASE_MANAGE), getVersions);
router.post("/versions", platformAuth, requirePermission(PERMISSIONS.RELEASE_MANAGE), addVersion);
router.patch("/versions/:id", platformAuth, requirePermission(PERMISSIONS.RELEASE_MANAGE), patchVersion);
router.delete("/versions/:id", platformAuth, requirePermission(PERMISSIONS.RELEASE_MANAGE), removeVersion);

export default router;
