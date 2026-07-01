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

const router = express.Router();

router.get("/api/shops/nearby", customerAuthOptional, getNearbyShops);
router.get("/api/shops/search", customerAuthOptional, searchShops);
router.get("/api/shops/featured", customerAuthOptional, getFeaturedShops);
router.get("/api/shops/:shopId", customerAuthOptional, getShopDetails);
router.get("/api/shops/:shopId/categories", customerAuthOptional, getShopCategories);
router.get("/api/shops/:shopId/products", customerAuthOptional, getShopProducts);

export default router;
