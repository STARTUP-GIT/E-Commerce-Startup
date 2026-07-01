import express from "express";
import { createCity, getCities, updateCity, deleteCity } from "../controllers/cityController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = express.Router();

router.post("/", adminAuth, createCity);
router.get("/", adminAuth, getCities);
router.put("/:id", adminAuth, updateCity);
router.delete("/:id", adminAuth, deleteCity);

export default router;
