import express from "express";
import {
    addProducts,
    getProducts,
    EditProduct,
    removeProducts,
    restoreDeletedProduct,
    updateProductStock,
    getLowStockProducts
} from "../controllers/productController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.post("/api/products", sellerAuth, writeLimiter, addProducts);
router.get("/api/products", sellerAuth, writeLimiter, getProducts);
router.get("/api/products/low-stock", sellerAuth, writeLimiter, getLowStockProducts);
router.put("/api/products/:productId", sellerAuth, writeLimiter, EditProduct);
router.delete("/api/products/:productId", sellerAuth, writeLimiter, removeProducts);
router.patch("/api/products/:productId/restore", sellerAuth, writeLimiter, restoreDeletedProduct);
router.patch("/api/products/:productId/stock", sellerAuth, writeLimiter, updateProductStock);

export default router;