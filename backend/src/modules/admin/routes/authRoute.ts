import { Router } from "express";
import {
    login,
    logout,
    getProfile,
    updateProfile,
    removeAvatar,
    updatePassword,
    requestEmailChange,
    verifyEmailChange,
    refresh,
    setupFirstAdmin,
    getSetupStatus,
    googleOAuth,
    listAdmins,
    createAdmin,
    inviteAdmin,
    getInvitationByToken,
    acceptInvitation,
    listInvitations,
    resendInvitation,
    revokeInvitation,
    listAccessRequests,
    approveAccessRequest,
    rejectAccessRequest,
    updateAdminStatus,
    revokeAdminSessions,
    updateAdminRole,
    resetAdminPassword,
    getAdminAuditLogs,
    forgotPassword,
    verifyOtp,
    resetPassword
} from "../controllers/authController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    adminLoginLimiter,
    adminGoogleOAuthLimiter,
    adminSetupLimiter,
    adminPasswordResetLimiter,
    adminPasswordChangeLimiter,
    adminEmailChangeLimiter,
    adminInvitationLimiter,
    adminRefreshLimiter,
} from "../../../middleware/rateLimiter.js";

const router = Router();

// ─── Public: Setup (no auth required) ────────────────────────────────────────
router.get("/setup/status", getSetupStatus);
router.post("/setup", adminSetupLimiter, setupFirstAdmin);

// ─── Public: Authentication ───────────────────────────────────────────────────
router.post("/login", adminLoginLimiter, login);
router.post("/google", adminGoogleOAuthLimiter, googleOAuth);
router.post("/refresh", adminRefreshLimiter, refresh);
router.post("/forgot-password", adminPasswordResetLimiter, forgotPassword);
router.post("/verify-otp", adminPasswordResetLimiter, verifyOtp);
router.post("/reset-password", adminPasswordResetLimiter, resetPassword);
router.post("/logout", adminAuth, logout);

// ─── Public: Invitation & Verification ────────────────────────────────────────
router.get("/invitations/verify", getInvitationByToken);
router.post("/invitations/accept", adminInvitationLimiter, acceptInvitation);
router.post("/email-change/verify", adminEmailChangeLimiter, verifyEmailChange);

// ─── Protected: Profile ───────────────────────────────────────────────────────
router.get("/profile", adminAuth, getProfile);
router.put("/profile", adminAuth, updateProfile);
router.delete("/profile/avatar", adminAuth, removeAvatar);
router.put("/profile/password", adminAuth, adminPasswordChangeLimiter, updatePassword);
router.post("/profile/email-change", adminAuth, adminEmailChangeLimiter, requestEmailChange);

// ─── Protected: Admin Management (permission gated) ───────────────────────────
router.get("/list", adminAuth, requirePermission("admin.users.manage"), listAdmins);
router.post("/", adminAuth, requirePermission("admin.users.manage"), createAdmin);
router.get("/invitations", adminAuth, requirePermission("admin.users.manage"), listInvitations);
router.post("/invitations", adminAuth, requirePermission("admin.users.manage"), adminInvitationLimiter, inviteAdmin);
router.post("/invitations/:id/resend", adminAuth, requirePermission("admin.users.manage"), resendInvitation);
router.delete("/invitations/:id", adminAuth, requirePermission("admin.users.manage"), revokeInvitation);
router.get("/access-requests", adminAuth, requirePermission("admin.users.manage"), listAccessRequests);
router.post("/access-requests/:id/approve", adminAuth, requirePermission("admin.users.manage"), approveAccessRequest);
router.post("/access-requests/:id/reject", adminAuth, requirePermission("admin.users.manage"), rejectAccessRequest);
router.patch("/:id/status", adminAuth, requirePermission("admin.users.manage"), updateAdminStatus);
router.post("/:id/revoke-sessions", adminAuth, requirePermission("admin.users.manage"), revokeAdminSessions);
router.patch("/:id/role", adminAuth, requirePermission("admin.roles.manage"), updateAdminRole);
router.post("/:id/reset-password", adminAuth, requirePermission("admin.users.manage"), resetAdminPassword);
router.get("/audit-logs", adminAuth, requirePermission("audit_logs.view"), getAdminAuditLogs);
router.get("/:id/audit-logs", adminAuth, requirePermission("audit_logs.view"), getAdminAuditLogs);

export default router;
