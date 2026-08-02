import express from "express";
import {
    getCart,
    addToCart,
    updateCartQuantity,
    removeCartItem,
    clearCart,
    moveToWishlist
} from "../controllers/cartController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/cart", customerAuth, writeLimiter, getCart);
router.post("/api/cart", customerAuth, writeLimiter, addToCart);
router.delete("/api/cart", customerAuth, writeLimiter, clearCart);
router.patch("/api/cart/:itemId", customerAuth, writeLimiter, updateCartQuantity);
router.delete("/api/cart/:itemId", customerAuth, writeLimiter, removeCartItem);
router.post("/api/cart/:itemId/move-to-wishlist", customerAuth, writeLimiter, moveToWishlist);

export default router;
