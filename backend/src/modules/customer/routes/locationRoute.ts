import express from "express";
import { getEnabledStates, getEnabledDistricts } from "../controllers/locationController.js";
import { cache } from "../../../middleware/cache.js";
import { publicReadLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/states", publicReadLimiter, cache(300), getEnabledStates);
router.get("/districts", publicReadLimiter, cache(300), getEnabledDistricts);

export default router;
