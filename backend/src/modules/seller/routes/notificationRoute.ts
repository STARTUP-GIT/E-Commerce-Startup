import express from "express";
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} from "../controllers/notificationController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";

const router = express.Router();

router.get("/api/notifications", sellerAuth, getNotifications);
router.patch("/api/notifications/read-all", sellerAuth, markAllNotificationsRead);
router.patch("/api/notifications/:notificationId/read", sellerAuth, markNotificationRead);
router.delete("/api/notifications/:notificationId", sellerAuth, deleteNotification);

export default router;
