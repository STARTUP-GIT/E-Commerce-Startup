import { Router } from "express";
import {
  listFeatureFlags,
  getFeatureFlag,
  toggleFeatureFlag,
  checkFlag,
  checkFlagsBulk,
} from "../controllers/featureFlagController.js";
import { platformAuth, requirePermission } from "../middleware/platformAuth.js";
import { PERMISSIONS } from "../utils/constants.js";

const router = Router();

// ─── Read-only (auto-registered features) ────────────────────────────────────
router.get("/", platformAuth, requirePermission(PERMISSIONS.FEATURE_FLAGS_VIEW), listFeatureFlags);
router.get("/:id", platformAuth, requirePermission(PERMISSIONS.FEATURE_FLAGS_VIEW), getFeatureFlag);

// ─── The only write operation — enable/disable a deployed feature ────────────
router.patch("/:id/toggle", platformAuth, requirePermission(PERMISSIONS.FEATURE_FLAGS_MANAGE), toggleFeatureFlag);

// ─── Engine (shared helper for Customer & Seller frontends) ──────────────────
router.get("/engine/check", platformAuth, checkFlag);
router.post("/engine/check", platformAuth, checkFlagsBulk);

export default router;
