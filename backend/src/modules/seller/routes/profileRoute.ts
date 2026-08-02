import express from "express";
import { getSellerProfile, updateSellerProfile } from "../controllers/profileController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/profile", sellerAuth, writeLimiter, getSellerProfile);
router.put("/api/profile", sellerAuth, writeLimiter, updateSellerProfile);

export default router;
