import { Router } from "express";
import {
  login,
  logout,
  refresh,
  getProfile,
  updateProfile,
  updatePassword,
  setupFirstUser,
  getSetupStatus,
  listUsers,
  createUser,
  updateUserStatus,
  updateUserRole,
  resetUserPassword,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
  createPermission,
  deletePermission,
} from "../controllers/authController.js";
import { platformAuth, requirePermission, requireOwner } from "../middleware/platformAuth.js";
import { loginLimiter, registerLimiter, passwordLimiter, adminLimiter } from "../../../middleware/rateLimiter.js";
import { PERMISSIONS } from "../utils/constants.js";

const router = Router();

// ─── Public ──────────────────────────────────────────────────────────────────
router.get("/setup/status", getSetupStatus);
router.post("/setup", registerLimiter, setupFirstUser);
router.post("/login", loginLimiter, login);
router.post("/refresh", passwordLimiter, refresh);
router.post("/logout", platformAuth, logout);

// ─── Profile ─────────────────────────────────────────────────────────────────
router.get("/profile", platformAuth, getProfile);
router.put("/profile", platformAuth, updateProfile);
router.put("/profile/password", platformAuth, updatePassword);

// ─── Platform Users ──────────────────────────────────────────────────────────
router.get("/users", platformAuth, requirePermission(PERMISSIONS.USERS_MANAGE), adminLimiter, listUsers);
router.post("/users", platformAuth, requirePermission(PERMISSIONS.USERS_MANAGE), createUser);
router.patch("/users/:id/status", platformAuth, requirePermission(PERMISSIONS.USERS_MANAGE), updateUserStatus);
router.patch("/users/:id/role", platformAuth, requirePermission(PERMISSIONS.USERS_MANAGE), updateUserRole);
router.post("/users/:id/reset-password", platformAuth, requirePermission(PERMISSIONS.USERS_MANAGE), resetUserPassword);

// ─── Roles ───────────────────────────────────────────────────────────────────
router.get("/roles", platformAuth, requirePermission(PERMISSIONS.ROLES_MANAGE), listRoles);
router.post("/roles", platformAuth, requirePermission(PERMISSIONS.ROLES_MANAGE), createRole);
router.put("/roles/:id", platformAuth, requirePermission(PERMISSIONS.ROLES_MANAGE), updateRole);
router.delete("/roles/:id", platformAuth, requirePermission(PERMISSIONS.ROLES_MANAGE), requireOwner, deleteRole);

// ─── Permissions ─────────────────────────────────────────────────────────────
router.get("/permissions", platformAuth, requirePermission(PERMISSIONS.PERMISSIONS_MANAGE), listPermissions);
router.post("/permissions", platformAuth, requirePermission(PERMISSIONS.PERMISSIONS_MANAGE), createPermission);
router.delete("/permissions/:id", platformAuth, requirePermission(PERMISSIONS.PERMISSIONS_MANAGE), requireOwner, deletePermission);

export default router;
