import express from "express";
import {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist
} from "../controllers/wishlistController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";
import { requireFeature } from "../../../middleware/featureGuard.js";

const router = express.Router();

router.use(requireFeature("WISHLIST", "CUSTOMER"));

router.get("/api/wishlist", customerAuth, writeLimiter, getWishlist);
router.post("/api/wishlist", customerAuth, writeLimiter, addToWishlist);
router.delete("/api/wishlist", customerAuth, writeLimiter, clearWishlist);
router.delete("/api/wishlist/:itemId", customerAuth, writeLimiter, removeFromWishlist);

export default router;
