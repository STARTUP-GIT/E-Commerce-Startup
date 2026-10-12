import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getGuidelines,
    getGuidelineDetail,
    createGuidelineDraft,
    updateGuidelineDraft,
    publishGuideline,
    getGuidelineAgreements
} from "../controllers/guidelineController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("guidelines.view", "settings.view"), getGuidelines);
router.post("/", requirePermission("guidelines.manage", "settings.manage"), createGuidelineDraft);
router.get("/agreements/all", requirePermission("guidelines.view", "sellers.view"), getGuidelineAgreements);
router.get("/:id", requirePermission("guidelines.view", "settings.view"), getGuidelineDetail);
router.put("/:id", requirePermission("guidelines.manage", "settings.manage"), updateGuidelineDraft);
router.post("/:id/publish", requirePermission("guidelines.publish", "settings.manage"), publishGuideline);
router.get("/:id/agreements", requirePermission("guidelines.view", "sellers.view"), getGuidelineAgreements);

export default router;
