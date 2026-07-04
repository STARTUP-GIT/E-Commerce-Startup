import express from "express";
import { getEnabledStates, getEnabledDistricts } from "../controllers/locationController.js";

const router = express.Router();

router.get("/states", getEnabledStates);
router.get("/districts", getEnabledDistricts);

export default router;
