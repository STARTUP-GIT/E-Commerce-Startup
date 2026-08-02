import express from "express";
import {
    getNearbyShops,
    searchShops,
    getShopDetails,
    getShopCategories,
    getShopProducts,
    getFeaturedShops
} from "../controllers/shopController.js";
import { customerAuthOptional } from "../../../middleware/customerAuth.js";
import { cache } from "../../../middleware/cache.js";
import { publicReadLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/shops/nearby", publicReadLimiter, customerAuthOptional, cache(30), getNearbyShops);
router.get("/api/shops/search", publicReadLimiter, customerAuthOptional, cache(30), searchShops);
router.get("/api/shops/featured", publicReadLimiter, customerAuthOptional, cache(120), getFeaturedShops);
router.get("/api/shops/:shopId", publicReadLimiter, customerAuthOptional, cache(120), getShopDetails);
router.get("/api/shops/:shopId/categories", publicReadLimiter, customerAuthOptional, cache(120), getShopCategories);
router.get("/api/shops/:shopId/products", publicReadLimiter, customerAuthOptional, cache(60), getShopProducts);

export default router;
