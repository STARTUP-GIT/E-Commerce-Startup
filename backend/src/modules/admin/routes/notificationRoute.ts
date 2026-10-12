import { Router } from "express";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { requirePermission } from "../../../middleware/requirePermission.js";
import {
    listNotifications,
    sendNotification,
    broadcastNotification,
    deleteNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from "../controllers/notificationController.js";

const router = Router();

router.use(adminAuth);

router.get("/", requirePermission("notifications.view"), listNotifications);
router.patch("/read-all", requirePermission("notifications.view"), markAllNotificationsAsRead);
router.patch("/:id/read", requirePermission("notifications.view"), markNotificationAsRead);
router.post("/send", requirePermission("notifications.manage"), sendNotification);
router.post("/broadcast", requirePermission("notifications.manage"), broadcastNotification);
router.delete("/:id", requirePermission("notifications.manage"), deleteNotification);

export default router;
