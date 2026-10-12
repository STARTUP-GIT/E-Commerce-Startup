import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    getPostmortems,
    getPostmortemDetail,
    createPostmortem,
    updatePostmortem
} from "../controllers/postmortemController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("postmortems.view", "cases.view"), getPostmortems);
router.get("/:id", requirePermission("postmortems.view", "cases.view"), getPostmortemDetail);
router.post("/", requirePermission("postmortems.manage", "cases.manage"), createPostmortem);
router.put("/:id", requirePermission("postmortems.manage", "cases.manage"), updatePostmortem);

export default router;
