import { Router } from "express";
import {
  listFeatureFlags,
  getFeatureFlag,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  toggleFeatureFlag,
  updateRollout,
  checkFlag,
  checkFlagsBulk,
  getFlagCatalog,
} from "../controllers/featureFlagController.js";
import { platformAuth, requirePermission } from "../middleware/platformAuth.js";
import { PERMISSIONS } from "../utils/constants.js";

const router = Router();

// ─── Management ──────────────────────────────────────────────────────────────
router.get("/", platformAuth, requirePermission(PERMISSIONS.FEATURE_FLAGS_VIEW), listFeatureFlags);
router.get("/catalog", platformAuth, requirePermission(PERMISSIONS.FEATURE_FLAGS_VIEW), getFlagCatalog);

// ─── Engine (helper exposed to frontends, mirrors isFeatureEnabled) ──────────
router.get("/engine/check", platformAuth, checkFlag);
router.post("/engine/check", platformAuth, checkFlagsBulk);

router.get("/:id", platformAuth, requirePermission(PERMISSIONS.FEATURE_FLAGS_VIEW), getFeatureFlag);
router.post("/", platformAuth, requirePermission(PERMISSIONS.FEATURE_FLAGS_MANAGE), createFeatureFlag);
router.put("/:id", platformAuth, requirePermission(PERMISSIONS.FEATURE_FLAGS_MANAGE), updateFeatureFlag);
router.patch("/:id/toggle", platformAuth, requirePermission(PERMISSIONS.FEATURE_FLAGS_MANAGE), toggleFeatureFlag);
router.patch("/:id/rollout", platformAuth, requirePermission(PERMISSIONS.FEATURE_FLAGS_MANAGE), updateRollout);
router.delete("/:id", platformAuth, requirePermission(PERMISSIONS.FEATURE_FLAGS_MANAGE), deleteFeatureFlag);

export default router;
