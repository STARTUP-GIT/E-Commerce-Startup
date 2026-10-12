import express from "express";
import {
    getNotifications,
    getUnreadCount,
    getSidebarBadges,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} from "../controllers/notificationController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/notifications", sellerAuth, writeLimiter, getNotifications);
router.get("/api/notifications/unread-count", sellerAuth, writeLimiter, getUnreadCount);
router.get("/api/sidebar-badges", sellerAuth, writeLimiter, getSidebarBadges);
router.patch("/api/notifications/read-all", sellerAuth, writeLimiter, markAllNotificationsRead);
router.patch("/api/notifications/mark-all-read", sellerAuth, writeLimiter, markAllNotificationsRead);
router.patch("/api/notifications/:notificationId/read", sellerAuth, writeLimiter, markNotificationRead);
router.delete("/api/notifications/:notificationId", sellerAuth, writeLimiter, deleteNotification);

export default router;
