import { Router } from "express";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import {
    getActiveGuideline,
    acceptGuideline,
    getMyAgreements
} from "../controllers/guidelineController.js";

const router = Router();

router.use(sellerAuth);

router.get("/active", getActiveGuideline);
router.post("/accept", acceptGuideline);
router.get("/agreements", getMyAgreements);

export default router;
