import express from "express";
import {
    resolveLocation,
    checkServiceability,
    getAvailableCities,
    submitLocationRequest,
    getStatesList,
    getDistrictsList
} from "../controllers/sharedLocationController.js";
import { publicReadLimiter, writeLimiter } from "../../../middleware/rateLimiter.js";
import { cache } from "../../../middleware/cache.js";

const router = express.Router();

// Location detection and resolution
router.post("/resolve", resolveLocation);

// Serviceability checks
router.post("/check-serviceability", checkServiceability);
router.get("/check-serviceability", (req, res) => {
    req.body = {
        state: req.query.state,
        district: req.query.district,
        city: req.query.city,
        town: req.query.town,
        serviceArea: req.query.serviceArea,
        postalCode: req.query.postalCode,
        latitude: req.query.lat,
        longitude: req.query.lng,
        userRole: req.query.role
    };
    return checkServiceability(req, res);
});

// Available cities dynamically loaded from backend
router.get("/available-cities", publicReadLimiter, cache(180), getAvailableCities);

// Location requests (customers / sellers / guests)
router.post("/request", writeLimiter, submitLocationRequest);

// Operational lists
router.get("/states", publicReadLimiter, cache(300), getStatesList);
router.get("/districts", publicReadLimiter, cache(300), getDistrictsList);

export default router;
