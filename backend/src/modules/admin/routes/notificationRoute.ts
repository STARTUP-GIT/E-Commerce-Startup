import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import {
    sendNotification,
    broadcastNotification,
    deleteNotification
} from "../controllers/notificationController.js";

const router = Router();

router.use(adminAuth);

router.post("/send", sendNotification);
router.post("/broadcast", broadcastNotification);
router.delete("/:id", deleteNotification);

export default router;
