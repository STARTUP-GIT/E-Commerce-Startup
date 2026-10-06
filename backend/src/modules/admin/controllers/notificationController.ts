import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { NotificationType, NotificationChannel } from "@prisma/client";

const DUPLICATE_WINDOW_MS = 60 * 1000;

const RECIPIENT_COLUMNS: Record<string, string> = {
    CUSTOMER: "customerId",
    SELLER: "sellerId",
    DELIVERY_PARTNER: "deliveryPartnerId",
    ADMIN: "adminId"
};

export const listNotifications = async (req: Request, res: Response) => {
    try {
        const { type, userType, search, page = 1, limit = 10 } = req.query;

        const whereClause: any = {};
        if (type) whereClause.type = String(type);

        if (userType) {
            const key = RECIPIENT_COLUMNS[String(userType).toUpperCase()];
            if (!key) return res.status(400).json({ message: "Invalid userType" });
            whereClause[key] = { not: null };
        }

        if (search && String(search).trim()) {
            const contains = { contains: String(search).trim(), mode: "insensitive" as const };
            whereClause.OR = [{ title: { ...contains } }, { body: { ...contains } }];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [notifications, total] = await prisma.$transaction([
            prisma.notification.findMany({
                where: whereClause,
                select: {
                    id: true,
                    type: true,
                    channel: true,
                    status: true,
                    title: true,
                    body: true,
                    sentAt: true,
                    readAt: true,
                    createdAt: true,
                    customerId: true,
                    sellerId: true,
                    deliveryPartnerId: true,
                    adminId: true
                },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.notification.count({ where: whereClause })
        ]);

        return res.status(200).json({
            notifications,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error: any) {
        console.error("LIST NOTIFICATIONS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const sendNotification = async (req: Request, res: Response) => {
    try {
        const { recipientId, recipientRole, title, body, type, channel } = req.body;

        if (!recipientId || !recipientRole || !title || !body) {
            return res.status(400).json({ message: "recipientId, recipientRole, title, and body are required" });
        }

        const data: any = {
            title,
            body,
            type: (type as NotificationType) || NotificationType.SYSTEM,
            channel: (channel as NotificationChannel) || NotificationChannel.IN_APP,
            status: "PENDING",
            sentAt: new Date()
        };

        const recipientColumn = RECIPIENT_COLUMNS[String(recipientRole).toUpperCase()];
        if (recipientColumn) data[recipientColumn] = recipientId;
        else {
            return res.status(400).json({ message: "Invalid recipientRole" });
        }

        const duplicate = await prisma.notification.findFirst({
            where: {
                type: data.type,
                title,
                body,
                [recipientColumn]: recipientId,
                createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) }
            }
        });
        if (duplicate) {
            return res.status(409).json({ message: "An identical notification was sent in the last minute." });
        }

        const notification = await prisma.notification.create({
            data
        });

        return res.status(200).json({
            message: "Notification created successfully",
            notification
        });
    } catch (error: any) {
        console.error("SEND NOTIFICATION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const broadcastNotification = async (req: Request, res: Response) => {
    try {
        const { targetGroup, selectedIds, selectedRole, title, body, type, channel } = req.body;

        if (!targetGroup || !title || !body) {
            return res.status(400).json({ message: "targetGroup, title, and body are required" });
        }

        const nType = (type as NotificationType) || NotificationType.SYSTEM;
        const nChannel = (channel as NotificationChannel) || NotificationChannel.IN_APP;

        let notificationsData: any[] = [];

        if (targetGroup === "CUSTOMERS") {
            const customers = await prisma.customer.findMany({
                where: { isDeactivated: false },
                select: { id: true }
            });
            notificationsData = customers.map(c => ({
                customerId: c.id,
                title,
                body,
                type: nType,
                channel: nChannel,
                status: "PENDING",
                sentAt: new Date()
            }));
        } else if (targetGroup === "SELLERS") {
            const sellers = await prisma.seller.findMany({
                where: { isDeactivated: false },
                select: { id: true }
            });
            notificationsData = sellers.map(s => ({
                sellerId: s.id,
                title,
                body,
                type: nType,
                channel: nChannel,
                status: "PENDING",
                sentAt: new Date()
            }));
        } else if (targetGroup === "EVERYONE") {
            const [customers, sellers, delivery] = await Promise.all([
                prisma.customer.findMany({ where: { isDeactivated: false }, select: { id: true } }),
                prisma.seller.findMany({ where: { isDeactivated: false }, select: { id: true } }),
                prisma.deliveryPartner.findMany({ where: { status: { not: "SUSPENDED" } }, select: { id: true } })
            ]);

            const customerNotifs = customers.map(c => ({
                customerId: c.id,
                title,
                body,
                type: nType,
                channel: nChannel,
                status: "PENDING",
                sentAt: new Date()
            }));

            const sellerNotifs = sellers.map(s => ({
                sellerId: s.id,
                title,
                body,
                type: nType,
                channel: nChannel,
                status: "PENDING",
                sentAt: new Date()
            }));

            const deliveryNotifs = delivery.map(d => ({
                deliveryPartnerId: d.id,
                title,
                body,
                type: nType,
                channel: nChannel,
                status: "PENDING",
                sentAt: new Date()
            }));

            notificationsData = [...customerNotifs, ...sellerNotifs, ...deliveryNotifs];
        } else if (targetGroup === "SELECTED") {
            if (!Array.isArray(selectedIds) || selectedIds.length === 0 || !selectedRole) {
                return res.status(400).json({ message: "selectedIds and selectedRole are required when targetGroup is SELECTED" });
            }

            notificationsData = selectedIds.map((id: string) => {
                const item: any = {
                    title,
                    body,
                    type: nType,
                    channel: nChannel,
                    status: "PENDING",
                    sentAt: new Date()
                };
                if (selectedRole === "CUSTOMER") item.customerId = id;
                else if (selectedRole === "SELLER") item.sellerId = id;
                else if (selectedRole === "DELIVERY_PARTNER") item.deliveryPartnerId = id;
                return item;
            });
        } else {
            return res.status(400).json({ message: "Invalid targetGroup" });
        }

        const scopeWhere: any = {};
        if (targetGroup === "CUSTOMERS") {
            scopeWhere.customerId = { not: null };
        } else if (targetGroup === "SELLERS") {
            scopeWhere.sellerId = { not: null };
        } else if (targetGroup === "EVERYONE") {
            scopeWhere.OR = [
                { customerId: { not: null } },
                { sellerId: { not: null } },
                { deliveryPartnerId: { not: null } }
            ];
        } else if (targetGroup === "SELECTED") {
            const selectedColumn = RECIPIENT_COLUMNS[String(selectedRole).toUpperCase()];
            if (selectedColumn) scopeWhere[selectedColumn] = { not: null };
        }

        const duplicate = await prisma.notification.findFirst({
            where: {
                type: nType,
                title,
                body,
                createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
                ...scopeWhere
            }
        });
        if (duplicate) {
            return res.status(409).json({ message: "An identical notification was sent in the last minute." });
        }

        if (notificationsData.length > 0) {
            await prisma.notification.createMany({
                data: notificationsData
            });
        }

        return res.status(200).json({
            message: `Successfully broadcasted to ${notificationsData.length} recipients.`
        });
    } catch (error: any) {
        console.error("BROADCAST NOTIFICATION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const notificationId = String(req.params.id);

        const notification = await prisma.notification.findUnique({
            where: { id: notificationId }
        });

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        await prisma.notification.delete({
            where: { id: notificationId }
        });

        return res.status(200).json({ message: "Notification deleted successfully" });
    } catch (error: any) {
        console.error("DELETE NOTIFICATION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
