import { Router } from "express";
import {
    createState,
    getStates,
    updateState,
    deleteState
} from "../controllers/stateController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";

const router = Router();

router.use(adminAuth);

router.post("/", requirePermission("catalog.manage"), createState);
router.get("/", requirePermission("catalog.view"), getStates);
router.put("/:id", requirePermission("catalog.manage"), updateState);
router.delete("/:id", requirePermission("catalog.manage"), deleteState);

export default router;
