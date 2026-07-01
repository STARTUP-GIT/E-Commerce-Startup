import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const notifications = await prisma.notification.findMany({
            where: {
                sellerId
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
        console.error("GET NOTIFICATIONS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const markNotificationRead = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const notificationId = req.params.notificationId;

        if (!sellerId) {
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
                sellerId
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
        console.error("MARK NOTIFICATION READ ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        await prisma.notification.updateMany({
            where: {
                sellerId,
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
        console.error("MARK ALL NOTIFICATIONS READ ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const notificationId = req.params.notificationId;

        if (!sellerId) {
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
                sellerId
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
        console.error("DELETE NOTIFICATION ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};