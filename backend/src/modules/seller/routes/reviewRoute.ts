import express from "express";
import {
    getReviews,
    replyToReview,
    deleteReply
} from "../controllers/reviewController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";

const router = express.Router();

router.get("/api/reviews", sellerAuth, getReviews);
router.post("/api/reviews/:reviewId/reply", sellerAuth, replyToReview);
router.delete("/api/reviews/:reviewId/reply", sellerAuth, deleteReply);

export default router;
