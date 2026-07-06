import { Router } from "express";
import {
    createCategory,
    getCategories,
    updateCategory,
    updateCategoryStatus,
    deleteCategory
} from "../controllers/categoryController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";

const router = Router();

router.post("/", adminAuth, createCategory);
router.get("/", adminAuth, getCategories);
router.put("/:id", adminAuth, updateCategory);
router.patch("/:id/status", adminAuth, updateCategoryStatus);
router.delete("/:id", adminAuth, deleteCategory);

export default router;
