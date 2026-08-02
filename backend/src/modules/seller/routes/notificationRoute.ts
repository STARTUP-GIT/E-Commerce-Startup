import express from "express";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} from "../controllers/notificationController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { writeLimiter } from "../../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/api/notifications", sellerAuth, writeLimiter, getNotifications);
router.patch("/api/notifications/read-all", sellerAuth, writeLimiter, markAllNotificationsRead);
router.patch("/api/notifications/:notificationId/read", sellerAuth, writeLimiter, markNotificationRead);
router.delete("/api/notifications/:notificationId", sellerAuth, writeLimiter, deleteNotification);

export default router;
