import express from "express";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";
import { uploadSingleImage } from "../../../middleware/multer.js";
import {
    getPackagingOptions,
    createPackagingOption,
    updatePackagingOption,
    togglePackagingOption,
    deletePackagingOption,
    uploadPackagingImage
} from "../controllers/packagingController.js";

const router = express.Router();

router.get("/api/shop/packaging", sellerAuth, getPackagingOptions);
router.post("/api/shop/packaging", sellerAuth, writeLimiter, createPackagingOption);
router.put("/api/shop/packaging/:id", sellerAuth, writeLimiter, updatePackagingOption);
router.patch("/api/shop/packaging/:id/toggle", sellerAuth, writeLimiter, togglePackagingOption);
router.delete("/api/shop/packaging/:id", sellerAuth, writeLimiter, deletePackagingOption);
router.post("/api/shop/packaging/upload-image", sellerAuth, uploadSingleImage, uploadPackagingImage);

export default router;
