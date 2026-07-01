import express from "express";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} from "../controllers/notificationController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";

const router = express.Router();

router.get("/api/notifications", customerAuth, getNotifications);
router.patch("/api/notifications/read-all", customerAuth, markAllNotificationsRead);
router.patch("/api/notifications/:notificationId/read", customerAuth, markNotificationRead);
router.delete("/api/notifications/:notificationId", customerAuth, deleteNotification);

export default router;
