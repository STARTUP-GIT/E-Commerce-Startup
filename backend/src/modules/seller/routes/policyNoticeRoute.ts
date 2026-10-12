import { Router } from "express";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import {
    getSellerPolicyNotices,
    markNoticeAsRead
} from "../controllers/policyNoticeController.js";

const router = Router();

router.use(sellerAuth);

router.get("/", getSellerPolicyNotices);
router.post("/:id/read", markNoticeAsRead);

export default router;
