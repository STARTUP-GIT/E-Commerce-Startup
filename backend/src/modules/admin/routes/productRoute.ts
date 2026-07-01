import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
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

router.get("/", getProducts);
router.get("/reported", getReportedProducts);
router.get("/:id", getProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/restore", restoreProduct);
router.patch("/:id/hide", hideProduct);
router.patch("/:id/unhide", unhideProduct);

export default router;
