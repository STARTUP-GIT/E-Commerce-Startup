import type { Request, Response } from "express";
import { notificationService } from "../../../services/notification/notification.service.js";

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
        const unreadOnly = req.query.unreadOnly === "true";

        const result = await notificationService.listNotifications("CUSTOMER", customerId, {
            page,
            limit,
            unreadOnly
        });

        return res.status(200).json({
            count: result.total,
            unreadCount: result.unreadCount,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
            notifications: result.notifications
        });
    } catch (error) {
        console.error("GET CUSTOMER NOTIFICATIONS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const unreadCount = await notificationService.getUnreadCount("CUSTOMER", customerId);
        return res.status(200).json({ unreadCount });
    } catch (error) {
        console.error("GET CUSTOMER UNREAD COUNT ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const markNotificationRead = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const notificationId = req.params.notificationId;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!notificationId) {
            return res.status(400).json({
                message: "Notification ID is required"
            });
        }

        const updated = await notificationService.markRead("CUSTOMER", customerId, notificationId as string);

        if (!updated) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        return res.status(200).json({
            message: "Notification marked as read",
            notification: updated
        });
    } catch (error) {
        console.error("MARK CUSTOMER NOTIFICATION READ ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const result = await notificationService.markAllRead("CUSTOMER", customerId);

        return res.status(200).json({
            message: "All notifications marked as read",
            count: result.count
        });
    } catch (error) {
        console.error("MARK ALL CUSTOMER NOTIFICATIONS READ ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const notificationId = req.params.notificationId;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!notificationId) {
            return res.status(400).json({
                message: "Notification ID is required"
            });
        }

        const deleted = await notificationService.deleteNotification("CUSTOMER", customerId, notificationId as string);

        if (!deleted) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        return res.status(200).json({
            message: "Notification deleted successfully"
        });
    } catch (error) {
        console.error("DELETE CUSTOMER NOTIFICATION ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};
