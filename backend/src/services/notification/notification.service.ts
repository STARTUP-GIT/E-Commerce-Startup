import { prisma } from "../../config/prisma.js";
import { NotificationType, NotificationChannel, NotificationStatus } from "@prisma/client";
import { sendRealtimeNotification } from "../chat/chat.service.js";

export interface CreateNotificationInput {
    recipientType: "CUSTOMER" | "SELLER" | "ADMIN" | "DELIVERY_PARTNER";
    recipientId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
    dedupKey?: string;
}

export interface FormattedNotification {
    id: string;
    type: NotificationType;
    channel: NotificationChannel;
    status: NotificationStatus;
    title: string;
    body: string;
    message: string;
    isRead: boolean;
    data: any;
    route: string | null;
    customerId?: string | null;
    sellerId?: string | null;
    adminId?: string | null;
    deliveryPartnerId?: string | null;
    readAt: Date | null;
    sentAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export function formatNotification(raw: any): FormattedNotification {
    const isRead = raw.status === "READ" || Boolean(raw.readAt);
    const route = raw.data?.route || raw.data?.link || null;
    return {
        id: raw.id,
        type: raw.type,
        channel: raw.channel,
        status: raw.status,
        title: raw.title,
        body: raw.body,
        message: raw.body,
        isRead,
        data: raw.data,
        route,
        customerId: raw.customerId,
        sellerId: raw.sellerId,
        adminId: raw.adminId,
        deliveryPartnerId: raw.deliveryPartnerId,
        readAt: raw.readAt,
        sentAt: raw.sentAt,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
    };
}

export const notificationService = {
    /**
     * Create a persistent notification and deliver via WebSocket if recipient is online
     */
    async createNotification(input: CreateNotificationInput): Promise<FormattedNotification | null> {
        try {
            const { recipientType, recipientId, type, title, body, data, dedupKey } = input;
            if (!recipientId) return null;

            // Deduplication window: 30 seconds
            const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
            const whereClause: any = {
                type,
                title,
                createdAt: { gte: thirtySecondsAgo }
            };

            if (recipientType === "CUSTOMER") whereClause.customerId = recipientId;
            else if (recipientType === "SELLER") whereClause.sellerId = recipientId;
            else if (recipientType === "ADMIN") whereClause.adminId = recipientId;
            else if (recipientType === "DELIVERY_PARTNER") whereClause.deliveryPartnerId = recipientId;

            const existing = await prisma.notification.findFirst({
                where: whereClause,
                orderBy: { createdAt: "desc" }
            });

            if (existing) {
                return formatNotification(existing);
            }

            const notification = await prisma.notification.create({
                data: {
                    customerId: recipientType === "CUSTOMER" ? recipientId : null,
                    sellerId: recipientType === "SELLER" ? recipientId : null,
                    adminId: recipientType === "ADMIN" ? recipientId : null,
                    deliveryPartnerId: recipientType === "DELIVERY_PARTNER" ? recipientId : null,
                    type,
                    channel: NotificationChannel.IN_APP,
                    status: NotificationStatus.PENDING,
                    title,
                    body,
                    data: data ? JSON.parse(JSON.stringify(data)) : null,
                    sentAt: new Date()
                }
            });

            const formatted = formatNotification(notification);

            // Push to connected WebSocket clients in real-time
            sendRealtimeNotification(recipientType, recipientId, formatted);

            return formatted;
        } catch (error) {
            console.error("NOTIFICATION SERVICE CREATE ERROR:", error);
            return null;
        }
    },

    /**
     * Fetch unread notification count
     */
    async getUnreadCount(recipientType: "CUSTOMER" | "SELLER" | "ADMIN", recipientId: string): Promise<number> {
        const whereClause: any = {
            status: { not: "READ" },
            readAt: null
        };
        if (recipientType === "CUSTOMER") whereClause.customerId = recipientId;
        else if (recipientType === "SELLER") whereClause.sellerId = recipientId;
        else if (recipientType === "ADMIN") whereClause.adminId = recipientId;

        return await prisma.notification.count({ where: whereClause });
    },

    /**
     * List notifications with pagination and filtering
     */
    async listNotifications(
        recipientType: "CUSTOMER" | "SELLER" | "ADMIN",
        recipientId: string,
        options: {
            page?: number;
            limit?: number;
            unreadOnly?: boolean;
            type?: NotificationType;
        } = {}
    ): Promise<{
        notifications: FormattedNotification[];
        total: number;
        unreadCount: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const page = Math.max(1, Number(options.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
        const skip = (page - 1) * limit;

        const whereClause: any = {};
        if (recipientType === "CUSTOMER") whereClause.customerId = recipientId;
        else if (recipientType === "SELLER") whereClause.sellerId = recipientId;
        else if (recipientType === "ADMIN") whereClause.adminId = recipientId;

        if (options.unreadOnly) {
            whereClause.status = { not: "READ" };
            whereClause.readAt = null;
        }

        if (options.type) {
            whereClause.type = options.type;
        }

        const unreadWhere: any = {
            status: { not: "READ" },
            readAt: null
        };
        if (recipientType === "CUSTOMER") unreadWhere.customerId = recipientId;
        else if (recipientType === "SELLER") unreadWhere.sellerId = recipientId;
        else if (recipientType === "ADMIN") unreadWhere.adminId = recipientId;

        const [records, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma.notification.count({ where: whereClause }),
            prisma.notification.count({ where: unreadWhere })
        ]);

        return {
            notifications: records.map(formatNotification),
            total,
            unreadCount,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1
        };
    },

    /**
     * Mark single notification as read
     */
    async markRead(recipientType: "CUSTOMER" | "SELLER" | "ADMIN", recipientId: string, notificationId: string): Promise<FormattedNotification | null> {
        const whereClause: any = { id: notificationId };
        if (recipientType === "CUSTOMER") whereClause.customerId = recipientId;
        else if (recipientType === "SELLER") whereClause.sellerId = recipientId;
        else if (recipientType === "ADMIN") whereClause.adminId = recipientId;

        const existing = await prisma.notification.findFirst({ where: whereClause });
        if (!existing) return null;

        const updated = await prisma.notification.update({
            where: { id: notificationId },
            data: {
                status: "READ",
                readAt: new Date()
            }
        });

        return formatNotification(updated);
    },

    /**
     * Mark all notifications as read for recipient
     */
    async markAllRead(recipientType: "CUSTOMER" | "SELLER" | "ADMIN", recipientId: string): Promise<{ count: number }> {
        const whereClause: any = {
            status: { not: "READ" }
        };
        if (recipientType === "CUSTOMER") whereClause.customerId = recipientId;
        else if (recipientType === "SELLER") whereClause.sellerId = recipientId;
        else if (recipientType === "ADMIN") whereClause.adminId = recipientId;

        const result = await prisma.notification.updateMany({
            where: whereClause,
            data: {
                status: "READ",
                readAt: new Date()
            }
        });

        return { count: result.count };
    },

    /**
     * Delete notification strictly owned by recipient
     */
    async deleteNotification(recipientType: "CUSTOMER" | "SELLER" | "ADMIN", recipientId: string, notificationId: string): Promise<boolean> {
        const whereClause: any = { id: notificationId };
        if (recipientType === "CUSTOMER") whereClause.customerId = recipientId;
        else if (recipientType === "SELLER") whereClause.sellerId = recipientId;
        else if (recipientType === "ADMIN") whereClause.adminId = recipientId;

        const existing = await prisma.notification.findFirst({ where: whereClause });
        if (!existing) return false;

        await prisma.notification.delete({ where: { id: notificationId } });
        return true;
    }
};
