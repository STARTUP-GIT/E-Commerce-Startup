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

const router = express.Router();

router.post("/api/shop", sellerAuth, createShop);
router.put("/api/shop", sellerAuth, updateShop);
router.get("/api/shop", sellerAuth, getShopInfo);
router.post("/api/shop/bank-account", sellerAuth, addBankAccountDetails);
router.get("/api/shop/bank-account", sellerAuth, getBankAccountDetails);
router.post("/api/shop/ban-appeal", sellerAuth, raiseBanIssue);
router.delete("/api/shop", sellerAuth, deleteShop);
router.patch("/api/shop/banner", sellerAuth, updateShopBanner);
router.patch("/api/shop/logo", sellerAuth, updateShopLogo);
router.get("/api/locations/states", sellerAuth, getActiveStates);
router.get("/api/locations/districts", sellerAuth, getActiveDistricts);
router.post("/api/shop/packing-fee/request", sellerAuth, requestPackingFeeApproval);
router.patch("/api/shop/packing-fee/toggle", sellerAuth, togglePackingFee);

export default router;