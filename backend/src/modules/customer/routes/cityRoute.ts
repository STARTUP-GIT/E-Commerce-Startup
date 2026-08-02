import express from "express";
import { getActiveCities } from "../controllers/cityController.js";
import { publicReadLimiter } from "../../../middleware/rateLimiter.js";
import { cache } from "../../../middleware/cache.js";

const router = express.Router();

router.get("/active", publicReadLimiter, cache(300), getActiveCities);

export default router;
