import express from "express";
import {
    getProducts,
    getProduct,
    searchProducts,
    filterProducts,
    getProductsByCategory,
    getFeaturedProducts,
    getRecommendedProducts,
    getRecentlyViewedProducts
} from "../controllers/productController.js";
import { customerAuthOptional } from "../../../middleware/customerAuth.js";
import { searchLimiter, publicReadLimiter } from "../../../middleware/rateLimiter.js";
import { cache } from "../../../middleware/cache.js";

const router = express.Router();

router.get("/api/products", publicReadLimiter, cache(60), getProducts);
router.get("/api/products/search", searchLimiter, cache(30), searchProducts);
router.get("/api/products/filter", searchLimiter, cache(30), filterProducts);
router.get("/api/products/featured", publicReadLimiter, cache(120), getFeaturedProducts);
router.get("/api/products/recommended", publicReadLimiter, customerAuthOptional, getRecommendedProducts);
router.get("/api/products/recently-viewed", publicReadLimiter, cache(30), getRecentlyViewedProducts);
router.get("/api/products/category/:categoryId", publicReadLimiter, cache(60), getProductsByCategory);
router.get("/api/products/:productId", publicReadLimiter, cache(60), getProduct);

export default router;
