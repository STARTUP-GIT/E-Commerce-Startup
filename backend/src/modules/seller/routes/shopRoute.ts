import express from "express";
import {
    createShop,
    getShopInfo,
    addBankAccountDetails,
    getBankAccountDetails,
    raiseBanIssue,
    deleteShop,
    updateShopBanner,
    updateShopLogo,
    getActiveStates,
    getActiveDistricts,
    updateShop,
    requestPackingFeeApproval,
    togglePackingFee
} from "../controllers/shopController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { writeLimiter, uploadLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.post("/api/shop", sellerAuth, writeLimiter, createShop);
router.put("/api/shop", sellerAuth, writeLimiter, updateShop);
router.get("/api/shop", sellerAuth, writeLimiter, getShopInfo);
router.post("/api/shop/bank-account", sellerAuth, writeLimiter, addBankAccountDetails);
router.get("/api/shop/bank-account", sellerAuth, writeLimiter, getBankAccountDetails);
router.post("/api/shop/ban-appeal", sellerAuth, writeLimiter, raiseBanIssue);
router.delete("/api/shop", sellerAuth, writeLimiter, deleteShop);
router.patch("/api/shop/banner", sellerAuth, uploadLimiter, updateShopBanner);
router.patch("/api/shop/logo", sellerAuth, uploadLimiter, updateShopLogo);
router.get("/api/locations/states", sellerAuth, writeLimiter, getActiveStates);
router.get("/api/locations/districts", sellerAuth, writeLimiter, getActiveDistricts);
router.post("/api/shop/packing-fee/request", sellerAuth, writeLimiter, requestPackingFeeApproval);
router.patch("/api/shop/packing-fee/toggle", sellerAuth, writeLimiter, togglePackingFee);

export default router;