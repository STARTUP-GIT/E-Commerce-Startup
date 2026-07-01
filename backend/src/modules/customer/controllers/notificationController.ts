import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const notifications = await prisma.notification.findMany({
            where: {
                customerId
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            count: notifications.length,
            notifications
        });

    } catch (error) {
        console.error("GET CUSTOMER NOTIFICATIONS ERROR:", error);
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

        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId as string,
                customerId
            }
        });

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        const updated = await prisma.notification.update({
            where: {
                id: notificationId as string
            },
            data: {
                status: "READ",
                readAt: new Date()
            }
        });

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

        await prisma.notification.updateMany({
            where: {
                customerId,
                status: {
                    not: "READ"
                }
            },
            data: {
                status: "READ",
                readAt: new Date()
            }
        });

        return res.status(200).json({
            message: "All notifications marked as read"
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

        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId as string,
                customerId
            }
        });

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        await prisma.notification.delete({
            where: {
                id: notificationId as string
            }
        });

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
