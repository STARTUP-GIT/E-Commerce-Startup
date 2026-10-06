import express from "express";
import { createCity, getCities, updateCity, deleteCity } from "../controllers/cityController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";

const router = express.Router();

router.use(adminAuth);

router.post("/", requirePermission("catalog.manage"), createCity);
router.get("/", requirePermission("catalog.view"), getCities);
router.put("/:id", requirePermission("catalog.manage"), updateCity);
router.delete("/:id", requirePermission("catalog.manage"), deleteCity);

export default router;
