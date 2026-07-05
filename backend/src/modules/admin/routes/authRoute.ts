import { Router } from "express";
import { login, logout, getProfile, updateProfile, changePassword, refresh, setupFirstAdmin, getSetupStatus } from "../controllers/authController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = Router();

router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", adminAuth, logout);
router.get("/profile", adminAuth, getProfile);
router.put("/profile", adminAuth, updateProfile);
router.put("/change-password", adminAuth, changePassword);
router.get("/setup/status", getSetupStatus);
router.post("/setup", setupFirstAdmin);
router.get("/api/auth/setup/status", getSetupStatus);
router.post("/api/auth/setup", setupFirstAdmin);

export default router;
