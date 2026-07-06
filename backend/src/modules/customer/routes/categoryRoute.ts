import express from "express";
import { getAllCategories, getAllowedCategories } from "../controllers/categoryController.js";

const router = express.Router();

router.get("/api/categories", getAllCategories);
router.get("/api/categories/allowed", getAllowedCategories);

export default router;
