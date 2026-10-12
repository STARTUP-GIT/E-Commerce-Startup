import { Router } from "express";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import {
    getSellerCommissionStatements,
    getSellerStatementDetail
} from "../controllers/commissionStatementController.js";

const router = Router();

router.use(sellerAuth);

router.get("/", getSellerCommissionStatements);
router.get("/:id", getSellerStatementDetail);

export default router;
