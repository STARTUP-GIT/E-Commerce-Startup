import express from "express";
import {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} from "../controllers/notificationController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/notifications", customerAuth, writeLimiter, getNotifications);
router.get("/api/notifications/unread-count", customerAuth, writeLimiter, getUnreadCount);
router.patch("/api/notifications/read-all", customerAuth, writeLimiter, markAllNotificationsRead);
router.patch("/api/notifications/mark-all-read", customerAuth, writeLimiter, markAllNotificationsRead);
router.patch("/api/notifications/:notificationId/read", customerAuth, writeLimiter, markNotificationRead);
router.delete("/api/notifications/:notificationId", customerAuth, writeLimiter, deleteNotification);

export default router;
