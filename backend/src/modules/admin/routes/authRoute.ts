import { Router } from "express";
import {
    login,
    logout,
    getProfile,
    updateProfile,
    updatePassword,
    refresh,
    setupFirstAdmin,
    getSetupStatus,
    googleOAuth,
    listAdmins,
    createAdmin,
    updateAdminStatus,
    updateAdminRole,
    resetAdminPassword
} from "../controllers/authController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = Router();

// ─── Public: Setup (no auth required) ────────────────────────────────────────
// Resolves as:
//   GET  /api/admin/auth/setup/status   (mounted at /api/admin/auth)
//   GET  /api/admin/setup/status        (mounted at /api/admin)
//   GET  /admin/setup/status            (mounted at /admin)
router.get("/setup/status", getSetupStatus);
router.post("/setup", setupFirstAdmin);

// ─── Public: Authentication ───────────────────────────────────────────────────
// Resolves as:
//   POST /api/admin/auth/login          (mounted at /api/admin/auth)
//   POST /api/admin/login               (mounted at /api/admin)  [fallback]
router.post("/login", login);
router.post("/google", googleOAuth);
router.post("/refresh", refresh);
router.post("/logout", adminAuth, logout);

// ─── Protected: Profile ───────────────────────────────────────────────────────
// Resolves as:
//   GET  /api/admin/profile             (mounted at /api/admin)
//   PUT  /api/admin/profile             (mounted at /api/admin)
//   PUT  /api/admin/profile/password    (mounted at /api/admin)
router.get("/profile", adminAuth, getProfile);
router.put("/profile", adminAuth, updateProfile);
router.put("/profile/password", adminAuth, updatePassword);

// ─── Protected: Admin Management (Super Admin only) ───────────────────────────
// Resolves as:
//   GET   /api/admin/list               (mounted at /api/admin)
//   POST  /api/admin                    (mounted at /api/admin)
//   PATCH /api/admin/:id/status         (mounted at /api/admin)
//   PATCH /api/admin/:id/role           (mounted at /api/admin)
//   POST  /api/admin/:id/reset-password (mounted at /api/admin)
router.get("/list", adminAuth, listAdmins);
router.post("/", adminAuth, createAdmin);
router.patch("/:id/status", adminAuth, updateAdminStatus);
router.patch("/:id/role", adminAuth, updateAdminRole);
router.post("/:id/reset-password", adminAuth, resetAdminPassword);

export default router;
