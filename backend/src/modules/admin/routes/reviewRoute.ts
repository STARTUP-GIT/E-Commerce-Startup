import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getReviews,
    deleteReview,
    hideReview,
    restoreReview
} from "../controllers/reviewController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("moderation.view"), getReviews);
router.delete("/:id", requirePermission("moderation.manage"), deleteReview);
router.patch("/:id/hide", requirePermission("moderation.manage"), hideReview);
router.patch("/:id/restore", requirePermission("moderation.manage"), restoreReview);

export default router;
