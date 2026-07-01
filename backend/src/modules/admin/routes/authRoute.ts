import { Router } from "express";
import { login, logout, getProfile, updateProfile, changePassword, refresh } from "../controllers/authController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = Router();

router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", adminAuth, logout);
router.get("/profile", adminAuth, getProfile);
router.put("/profile", adminAuth, updateProfile);
router.put("/change-password", adminAuth, changePassword);

export default router;
