import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon
} from "../controllers/couponController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("coupons.view"), getCoupons);
router.post("/", requirePermission("coupons.manage"), createCoupon);
router.patch("/:id", requirePermission("coupons.manage"), updateCoupon);
router.delete("/:id", requirePermission("coupons.manage"), deleteCoupon);

export default router;
