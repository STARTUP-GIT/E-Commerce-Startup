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

// Public setup routes
router.get("/setup/status", getSetupStatus);
router.post("/setup", setupFirstAdmin);
router.get("/auth/setup/status", getSetupStatus); // For /api/admin/auth/setup/status
router.post("/auth/setup", setupFirstAdmin);       // For /api/admin/auth/setup
router.get("/api/auth/setup/status", getSetupStatus); // For /admin/api/auth/setup/status
router.post("/api/auth/setup", setupFirstAdmin);       // For /admin/api/auth/setup

// Authentication routes
router.post("/login", login);
router.post("/google", googleOAuth);
router.post("/refresh", refresh);
router.post("/logout", adminAuth, logout);

// Profile management
router.get("/profile", adminAuth, getProfile);
router.put("/profile", adminAuth, updateProfile);
router.put("/profile/password", adminAuth, updatePassword);

// Admin management (Super Admin only)
router.get("/list", adminAuth, listAdmins);
router.post("/", adminAuth, createAdmin);
router.patch("/:id/status", adminAuth, updateAdminStatus);
router.patch("/:id/role", adminAuth, updateAdminRole);
router.post("/:id/reset-password", adminAuth, resetAdminPassword);

export default router;
