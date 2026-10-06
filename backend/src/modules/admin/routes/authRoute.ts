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
    resetAdminPassword,
    forgotPassword,
    verifyOtp,
    resetPassword
} from "../controllers/authController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    loginLimiter,
    registerLimiter,
    passwordLimiter,
    googleOAuthLimiter,
    otpLimiter,
} from "../../../middleware/rateLimiter.js";

const router = Router();

// ─── Public: Setup (no auth required) ────────────────────────────────────────
router.get("/setup/status", getSetupStatus);
router.post("/setup", registerLimiter, setupFirstAdmin);

// ─── Public: Authentication ───────────────────────────────────────────────────
router.post("/login", loginLimiter, login);
router.post("/google", googleOAuthLimiter, googleOAuth);
router.post("/refresh", passwordLimiter, refresh);
router.post("/forgot-password", passwordLimiter, forgotPassword);
router.post("/verify-otp", otpLimiter, verifyOtp);
router.post("/reset-password", passwordLimiter, resetPassword);
router.post("/logout", adminAuth, logout);

// ─── Protected: Profile ───────────────────────────────────────────────────────
router.get("/profile", adminAuth, getProfile);
router.put("/profile", adminAuth, updateProfile);
router.put("/profile/password", adminAuth, updatePassword);

// ─── Protected: Admin Management (permission gated) ───────────────────────────
router.get("/list", adminAuth, requirePermission("admin.users.manage"), listAdmins);
router.post("/", adminAuth, requirePermission("admin.users.manage"), createAdmin);
router.patch("/:id/status", adminAuth, requirePermission("admin.users.manage"), updateAdminStatus);
router.patch("/:id/role", adminAuth, requirePermission("admin.roles.manage"), updateAdminRole);
router.post("/:id/reset-password", adminAuth, requirePermission("admin.users.manage"), resetAdminPassword);

export default router;
