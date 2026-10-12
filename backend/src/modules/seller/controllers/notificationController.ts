import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { notificationService } from "../../../services/notification/notification.service.js";

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
        const unreadOnly = req.query.unreadOnly === "true";
        const type = req.query.type as any;

        const result = await notificationService.listNotifications("SELLER", sellerId, {
            page,
            limit,
            unreadOnly,
            type
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
        console.error("GET SELLER NOTIFICATIONS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const unreadCount = await notificationService.getUnreadCount("SELLER", sellerId);
        return res.status(200).json({ unreadCount });
    } catch (error) {
        console.error("GET SELLER UNREAD COUNT ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getSidebarBadges = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const [
            ordersCount,
            customRequestsCount,
            payoutsCount,
            reviewsCount,
            complianceCount,
            policiesCount,
            commissionStatementsCount,
            supportCount,
            agreementsCount,
            unreadNotificationsCount
        ] = await Promise.all([
            // Orders needing seller action (PENDING)
            prisma.sellerOrder.count({
                where: { sellerId, status: "PENDING" }
            }),
            // Custom requests pending review
            prisma.customOrderQuote.count({
                where: { sellerId, isAccepted: false, rejectedAt: null }
            }),
            // Payouts pending or in processing
            prisma.sellerPayout.count({
                where: { sellerId, status: { in: ["PENDING", "PROCESSING"] } }
            }),
            // Reviews needing seller response
            prisma.review.count({
                where: { product: { sellerId }, reply: null }
            }),
            // Active compliance strikes/warnings
            prisma.sellerStrike.count({
                where: { sellerId, isActive: true, status: { in: ["ISSUED", "UNDER_APPEAL", "UPHELD"] } }
            }),
            // Policy notices awaiting seller read
            prisma.marketplacePolicyNotice.count({
                where: { status: "PUBLISHED", reads: { none: { sellerId } } }
            }),
            // Commission statements unpaid
            prisma.commissionStatement.count({
                where: { sellerId, status: "PUBLISHED", outstandingBalance: { gt: 0 } }
            }),
            // Unread admin support messages
            prisma.conversationMessage.count({
                where: {
                    conversation: { sellerId },
                    senderType: "ADMIN",
                    readAt: null
                }
            }),
            // Shop agreements issued requiring acceptance
            prisma.shopAgreement.count({
                where: {
                    shop: { sellerId },
                    status: "ISSUED"
                }
            }),
            // Total unread notifications
            notificationService.getUnreadCount("SELLER", sellerId)
        ]);

        return res.status(200).json({
            badges: {
                orders: ordersCount,
                customRequests: customRequestsCount,
                payouts: payoutsCount,
                reviews: reviewsCount,
                compliance: complianceCount,
                policies: policiesCount,
                commissionStatements: commissionStatementsCount,
                support: supportCount,
                shop: agreementsCount,
                notifications: unreadNotificationsCount
            }
        });
    } catch (error) {
        console.error("GET SELLER SIDEBAR BADGES ERROR:", error);
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

        const updated = await notificationService.markRead("SELLER", sellerId, notificationId as string);

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
        console.error("MARK SELLER NOTIFICATION READ ERROR:", error);
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

        const result = await notificationService.markAllRead("SELLER", sellerId);

        return res.status(200).json({
            message: "All notifications marked as read",
            count: result.count
        });

    } catch (error) {
        console.error("MARK ALL SELLER NOTIFICATIONS READ ERROR:", error);
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

        const deleted = await notificationService.deleteNotification("SELLER", sellerId, notificationId as string);

        if (!deleted) {
            return res.status(404).json({
                message: "Notification not found"
            });
        }

        return res.status(200).json({
            message: "Notification deleted successfully"
        });

    } catch (error) {
        console.error("DELETE SELLER NOTIFICATION ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};