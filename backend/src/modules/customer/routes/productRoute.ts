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

router.get("/api/products", getProducts);
router.get("/api/products/search", searchProducts);
router.get("/api/products/filter", filterProducts);
router.get("/api/products/featured", getFeaturedProducts);
router.get("/api/products/recommended", customerAuthOptional, getRecommendedProducts);
router.get("/api/products/recently-viewed", getRecentlyViewedProducts);
router.get("/api/products/category/:categoryId", getProductsByCategory);
router.get("/api/products/:productId", getProduct);

export default router;
