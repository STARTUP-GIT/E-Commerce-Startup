import express from "express";
import {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist
} from "../controllers/wishlistController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";

const router = express.Router();

router.get("/api/wishlist", customerAuth, getWishlist);
router.post("/api/wishlist", customerAuth, addToWishlist);
router.delete("/api/wishlist", customerAuth, clearWishlist);
router.delete("/api/wishlist/:itemId", customerAuth, removeFromWishlist);

export default router;
