import express from "express";
import { getAllCategories, getAllowedCategories } from "../controllers/categoryController.js";
import { cache } from "../../../middleware/cache.js";
import { publicReadLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/categories", publicReadLimiter, cache(300), getAllCategories);
router.get("/api/categories/allowed", publicReadLimiter, cache(300), getAllowedCategories);

export default router;
