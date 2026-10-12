import { Router } from "express";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { getSellerEnforcements } from "../controllers/enforcementController.js";

const router = Router();

router.use(sellerAuth);

router.get("/", getSellerEnforcements);

export default router;
