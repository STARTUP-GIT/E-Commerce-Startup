import express from "express";
import { getEnabledStates, getEnabledDistricts } from "../controllers/locationController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";

const router = express.Router();

router.get("/api/location/states", sellerAuth, getEnabledStates);
router.get("/api/location/districts", sellerAuth, getEnabledDistricts);

export default router;
