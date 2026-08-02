import express from "express";
import { getEnabledStates, getEnabledDistricts } from "../controllers/locationController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/location/states", sellerAuth, writeLimiter, getEnabledStates);
router.get("/api/location/districts", sellerAuth, writeLimiter, getEnabledDistricts);

export default router;
