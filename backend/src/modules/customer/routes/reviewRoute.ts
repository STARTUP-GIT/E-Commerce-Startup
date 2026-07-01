import express from "express";
import {
    getProductReviews,
    addReview,
    editReview,
    deleteReview
} from "../controllers/reviewController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";

const router = express.Router();

router.get("/api/reviews/product/:productId", customerAuth, getProductReviews);
router.post("/api/reviews", customerAuth, addReview);
router.patch("/api/reviews/:reviewId", customerAuth, editReview);
router.delete("/api/reviews/:reviewId", customerAuth, deleteReview);

export default router;
