import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon
} from "../controllers/couponController.js";

const router = Router();

router.use(adminAuth);

router.get("/", getCoupons);
router.post("/", createCoupon);
router.patch("/:id", updateCoupon);
router.delete("/:id", deleteCoupon);

export default router;
