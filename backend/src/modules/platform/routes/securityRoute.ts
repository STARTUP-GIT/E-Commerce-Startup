import { Router } from "express";
import {
  getSecuritySettings,
  updateRateLimits,
  getBlockedIps,
  addBlockedIp,
  removeBlockedIp,
  getSessions,
  revokeSession,
  getVersionHistory,
} from "../controllers/securityController.js";
import { getApiKeys, createKey, revokeKey, removeKey } from "../controllers/apiKeyController.js";
import { platformAuth, requirePermission } from "../middleware/platformAuth.js";
import { PERMISSIONS } from "../utils/constants.js";

const router = Router();

// ─── Security ────────────────────────────────────────────────────────────────
router.get("/", platformAuth, requirePermission(PERMISSIONS.SECURITY_MANAGE), getSecuritySettings);
router.patch("/rate-limits", platformAuth, requirePermission(PERMISSIONS.SECURITY_MANAGE), updateRateLimits);
router.get("/blocked-ips", platformAuth, requirePermission(PERMISSIONS.SECURITY_MANAGE), getBlockedIps);
router.post("/blocked-ips", platformAuth, requirePermission(PERMISSIONS.SECURITY_MANAGE), addBlockedIp);
router.delete("/blocked-ips/:ip", platformAuth, requirePermission(PERMISSIONS.SECURITY_MANAGE), removeBlockedIp);
router.get("/sessions", platformAuth, requirePermission(PERMISSIONS.SECURITY_MANAGE), getSessions);
router.post("/sessions/:id/revoke", platformAuth, requirePermission(PERMISSIONS.SECURITY_MANAGE), revokeSession);
router.get("/versions", platformAuth, requirePermission(PERMISSIONS.VERSIONS_VIEW), getVersionHistory);

// ─── API Keys ────────────────────────────────────────────────────────────────
router.get("/api-keys", platformAuth, requirePermission(PERMISSIONS.API_KEYS_MANAGE), getApiKeys);
router.post("/api-keys", platformAuth, requirePermission(PERMISSIONS.API_KEYS_MANAGE), createKey);
router.post("/api-keys/:id/revoke", platformAuth, requirePermission(PERMISSIONS.API_KEYS_MANAGE), revokeKey);
router.delete("/api-keys/:id", platformAuth, requirePermission(PERMISSIONS.API_KEYS_MANAGE), removeKey);

export default router;
