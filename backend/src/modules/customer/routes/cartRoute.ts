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

const router = express.Router();

router.get("/api/cart", customerAuth, getCart);
router.post("/api/cart", customerAuth, addToCart);
router.delete("/api/cart", customerAuth, clearCart);
router.patch("/api/cart/:itemId", customerAuth, updateCartQuantity);
router.delete("/api/cart/:itemId", customerAuth, removeCartItem);
router.post("/api/cart/:itemId/move-to-wishlist", customerAuth, moveToWishlist);

export default router;
