import express from "express";
import {
    resolveLocation,
    searchLocations,
    checkServiceability,
    getAvailableCities,
    submitLocationRequest,
    getStatesList,
    getDistrictsList
} from "../controllers/sharedLocationController.js";
import { publicReadLimiter, writeLimiter } from "../../../middleware/rateLimiter.js";
import { cache } from "../../../middleware/cache.js";

const router = express.Router();

// Location detection, search and resolution
router.post("/resolve", resolveLocation);
router.get("/search", publicReadLimiter, searchLocations);

// Serviceability checks
router.post("/check-serviceability", checkServiceability);
router.get("/check-serviceability", checkServiceability);

// Available cities dynamically loaded from backend
router.get("/available-cities", publicReadLimiter, cache(180), getAvailableCities);

// Location requests (customers / sellers / guests)
router.post("/request", writeLimiter, submitLocationRequest);

// Operational lists
router.get("/states", publicReadLimiter, cache(300), getStatesList);
router.get("/districts", publicReadLimiter, cache(300), getDistrictsList);

export default router;
