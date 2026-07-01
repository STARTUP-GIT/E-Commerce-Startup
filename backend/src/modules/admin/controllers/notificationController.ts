import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { NotificationType, NotificationChannel } from "@prisma/client";

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

        if (recipientRole === "CUSTOMER") data.customerId = recipientId;
        else if (recipientRole === "SELLER") data.sellerId = recipientId;
        else if (recipientRole === "DELIVERY_PARTNER") data.deliveryPartnerId = recipientId;
        else if (recipientRole === "ADMIN") data.adminId = recipientId;
        else {
            return res.status(400).json({ message: "Invalid recipientRole" });
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
