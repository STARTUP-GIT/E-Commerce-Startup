import express from "express";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} from "../controllers/notificationController.js";
import { customerAuth } from "../../../middleware/customerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/notifications", customerAuth, writeLimiter, getNotifications);
router.patch("/api/notifications/read-all", customerAuth, writeLimiter, markAllNotificationsRead);
router.patch("/api/notifications/:notificationId/read", customerAuth, writeLimiter, markNotificationRead);
router.delete("/api/notifications/:notificationId", customerAuth, writeLimiter, deleteNotification);

export default router;
