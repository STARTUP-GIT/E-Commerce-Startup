import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getPolicyNotices,
    getPolicyNoticeDetail,
    createPolicyNotice,
    updatePolicyNotice,
    publishPolicyNotice,
    getPolicyNoticeReads
} from "../controllers/policyNoticeController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("policies.view", "content.view"), getPolicyNotices);
router.post("/", requirePermission("policies.manage", "content.manage"), createPolicyNotice);
router.get("/:id", requirePermission("policies.view", "content.view"), getPolicyNoticeDetail);
router.put("/:id", requirePermission("policies.manage", "content.manage"), updatePolicyNotice);
router.post("/:id/publish", requirePermission("policies.publish", "content.manage"), publishPolicyNotice);
router.get("/:id/reads", requirePermission("policies.view", "content.view"), getPolicyNoticeReads);

export default router;
