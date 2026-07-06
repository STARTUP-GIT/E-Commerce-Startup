import express from "express";
import { getAllowedCategories } from "../../customer/controllers/categoryController.js";

const router = express.Router();

router.get("/api/categories/allowed", getAllowedCategories);

export default router;
