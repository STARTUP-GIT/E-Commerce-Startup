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

const router = express.Router();

router.get("/api/products", customerAuthOptional, getProducts);
router.get("/api/products/search", customerAuthOptional, searchProducts);
router.get("/api/products/filter", customerAuthOptional, filterProducts);
router.get("/api/products/featured", customerAuthOptional, getFeaturedProducts);
router.get("/api/products/recommended", customerAuthOptional, getRecommendedProducts);
router.get("/api/products/recently-viewed", customerAuthOptional, getRecentlyViewedProducts);
router.get("/api/products/category/:categoryId", customerAuthOptional, getProductsByCategory);
router.get("/api/products/:productId", customerAuthOptional, getProduct);

export default router;
