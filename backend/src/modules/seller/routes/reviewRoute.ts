import express from "express";
import {
    getReviews,
    replyToReview,
    deleteReply
} from "../controllers/reviewController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/reviews", sellerAuth, writeLimiter, getReviews);
router.post("/api/reviews/:reviewId/reply", sellerAuth, writeLimiter, replyToReview);
router.delete("/api/reviews/:reviewId/reply", sellerAuth, writeLimiter, deleteReply);

export default router;
