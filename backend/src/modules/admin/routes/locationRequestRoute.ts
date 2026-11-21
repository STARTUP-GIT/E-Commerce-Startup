import express from "express";
import {
    listLocationRequests,
    updateLocationRequest,
    getLocationRequestsSummary
} from "../controllers/locationRequestController.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";

const router = express.Router();

router.use(adminAuth);

router.get("/summary", requirePermission("catalog.view"), getLocationRequestsSummary);
router.get("/", requirePermission("catalog.view"), listLocationRequests);
router.patch("/:id", requirePermission("catalog.manage"), updateLocationRequest);

export default router;
