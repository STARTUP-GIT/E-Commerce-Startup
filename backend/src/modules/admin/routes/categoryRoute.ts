import { Router } from "express";
import {
    createCategory,
    getCategories,
    updateCategory,
    updateCategoryStatus,
    deleteCategory
} from "../controllers/categoryController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";

const router = Router();

router.use(adminAuth);

router.post("/", requirePermission("catalog.manage"), createCategory);
router.get("/", requirePermission("catalog.view"), getCategories);
router.put("/:id", requirePermission("catalog.manage"), updateCategory);
router.patch("/:id/status", requirePermission("catalog.manage"), updateCategoryStatus);
router.delete("/:id", requirePermission("catalog.manage"), deleteCategory);

export default router;
