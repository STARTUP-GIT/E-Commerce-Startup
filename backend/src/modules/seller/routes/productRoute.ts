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

const router = express.Router();

router.post("/api/products", sellerAuth, addProducts);
router.get("/api/products", sellerAuth, getProducts);
router.get("/api/products/low-stock", sellerAuth, getLowStockProducts);
router.put("/api/products/:productId", sellerAuth, EditProduct);
router.delete("/api/products/:productId", sellerAuth, removeProducts);
router.patch("/api/products/:productId/restore", sellerAuth, restoreDeletedProduct);
router.patch("/api/products/:productId/stock", sellerAuth, updateProductStock);

export default router;