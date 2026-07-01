import express from "express";
import { getActiveCities } from "../controllers/cityController.js";

const router = express.Router();

router.get("/active", getActiveCities);

export default router;
