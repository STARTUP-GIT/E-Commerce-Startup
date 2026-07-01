import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import {
    getReviews,
    deleteReview,
    hideReview,
    restoreReview
} from "../controllers/reviewController.js";

const router = Router();

router.use(adminAuth);

router.get("/", getReviews);
router.delete("/:id", deleteReview);
router.patch("/:id/hide", hideReview);
router.patch("/:id/restore", restoreReview);

export default router;
