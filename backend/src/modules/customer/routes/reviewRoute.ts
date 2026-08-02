import express from "express";
import {
    getProductReviews,
    addReview,
    editReview,
    deleteReview
} from "../controllers/reviewController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";
import { publicReadLimiter, writeLimiter } from "../../../middleware/rateLimiter.js";
import { cache } from "../../../middleware/cache.js";

const router = express.Router();

router.get("/api/reviews/product/:productId", publicReadLimiter, cache(60), getProductReviews);
router.post("/api/reviews", customerAuth, writeLimiter, addReview);
router.patch("/api/reviews/:reviewId", customerAuth, writeLimiter, editReview);
router.delete("/api/reviews/:reviewId", customerAuth, writeLimiter, deleteReview);

export default router;
