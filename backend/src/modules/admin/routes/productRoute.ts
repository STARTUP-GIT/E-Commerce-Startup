import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getProducts,
    getProduct,
    deleteProduct,
    restoreProduct,
    hideProduct,
    unhideProduct,
    getReportedProducts
} from "../controllers/productController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("moderation.view"), getProducts);
router.get("/reported", requirePermission("moderation.view"), getReportedProducts);
router.get("/:id", requirePermission("moderation.view"), getProduct);
router.delete("/:id", requirePermission("moderation.manage"), deleteProduct);
router.patch("/:id/restore", requirePermission("moderation.manage"), restoreProduct);
router.patch("/:id/hide", requirePermission("moderation.manage"), hideProduct);
router.patch("/:id/unhide", requirePermission("moderation.manage"), unhideProduct);

export default router;
