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

// ─── Protected: Admin Management (Super Admin only) ───────────────────────────
router.get("/list", adminAuth, listAdmins);
router.post("/", adminAuth, createAdmin);
router.patch("/:id/status", adminAuth, updateAdminStatus);
router.patch("/:id/role", adminAuth, updateAdminRole);
router.post("/:id/reset-password", adminAuth, resetAdminPassword);

export default router;
