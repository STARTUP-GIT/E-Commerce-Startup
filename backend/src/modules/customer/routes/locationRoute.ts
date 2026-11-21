import express from "express";
import {
    getEnabledStates,
    getEnabledDistricts,
    checkLocationServiceability,
    subscribeLocationNotifyMe,
    withdrawLocationNotifyMe
} from "../controllers/locationController.js";
import {
    resolveLocation,
    getAvailableCities,
    submitLocationRequest
} from "../../general/controllers/sharedLocationController.js";
import { cache } from "../../../middleware/cache.js";
import { publicReadLimiter, writeLimiter } from "../../../middleware/rateLimiter.js";
import { customerAuthOptional } from "../../../middleware/customerAuth.js";

const router = express.Router();

router.get("/states", publicReadLimiter, cache(300), getEnabledStates);
router.get("/districts", publicReadLimiter, cache(300), getEnabledDistricts);

// Serviceability and detection
router.post("/resolve", resolveLocation);
router.get("/available-cities", publicReadLimiter, cache(180), getAvailableCities);
router.post("/request", writeLimiter, submitLocationRequest);

router.post("/check-serviceability", checkLocationServiceability);
router.get("/serviceability", (req, res) => {
    req.body = {
        state: req.query.state,
        district: req.query.district,
        city: req.query.city,
        postalCode: req.query.postalCode,
        latitude: req.query.lat,
        longitude: req.query.lng
    };
    return checkLocationServiceability(req, res);
});

// Coming Soon Notify Me
router.post("/notify-me", customerAuthOptional, subscribeLocationNotifyMe);
router.delete("/notify-me/:id", customerAuthOptional, withdrawLocationNotifyMe);

export default router;
