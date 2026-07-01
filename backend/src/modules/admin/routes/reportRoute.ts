import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import {
    getReportedProducts,
    getReportedShops,
    resolveReport,
    deleteReport
} from "../controllers/reportController.js";

const router = Router();

router.use(adminAuth);

router.get("/products", getReportedProducts);
router.get("/shops", getReportedShops);
router.patch("/:id/resolve", resolveReport);
router.delete("/:id", deleteReport);

export default router;
