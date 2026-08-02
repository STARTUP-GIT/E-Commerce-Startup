import express from "express";
import { getAllowedCategories } from "../../customer/controllers/categoryController.js";
import { publicReadLimiter } from "../../../middleware/rateLimiter.js";
import { cache } from "../../../middleware/cache.js";

const router = express.Router();

router.get("/api/categories/allowed", publicReadLimiter, cache(300), getAllowedCategories);

export default router;
