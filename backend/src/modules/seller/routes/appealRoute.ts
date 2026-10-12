import { Router } from "express";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import {
    getMyAppeals,
    getAppealDetail,
    createAppeal,
    submitAdditionalInfo
} from "../controllers/appealController.js";

const router = Router();

router.use(sellerAuth);

router.get("/", getMyAppeals);
router.post("/", createAppeal);
router.get("/:id", getAppealDetail);
router.post("/:id/additional-info", submitAdditionalInfo);

export default router;
