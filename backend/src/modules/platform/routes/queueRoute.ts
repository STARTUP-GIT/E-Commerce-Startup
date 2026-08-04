import { Router } from "express";
import { getQueues, getJobs, runJob } from "../controllers/queueController.js";
import { platformAuth, requirePermission } from "../middleware/platformAuth.js";
import { PERMISSIONS } from "../utils/constants.js";

const router = Router();

router.get("/", platformAuth, requirePermission(PERMISSIONS.QUEUES_MANAGE), getQueues);
router.get("/jobs", platformAuth, requirePermission(PERMISSIONS.QUEUES_MANAGE), getJobs);
router.post("/jobs/run", platformAuth, requirePermission(PERMISSIONS.QUEUES_MANAGE), runJob);

export default router;
