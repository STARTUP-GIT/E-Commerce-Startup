import express from "express";
import { getSellerProfile, updateSellerProfile } from "../controllers/profileController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";

const router = express.Router();

router.get("/api/profile", sellerAuth, getSellerProfile);
router.put("/api/profile", sellerAuth, updateSellerProfile);

export default router;
