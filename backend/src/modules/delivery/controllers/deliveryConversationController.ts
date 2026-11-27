import type { Request, Response } from "express";
import { ConversationType, ConversationStatus, MessageSenderType } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import {
    broadcastToConversation,
    broadcastToAdmins,
    broadcastReadReceipt,
    subscribeActorToConversation
} from "../../../services/chat/chat.service.js";
import {
    getMessageRetentionFilter,
    getRetentionCutoffDate
} from "../../../services/chat/chatRetention.service.js";

// ─── GET /api/delivery/conversations ─────────────────────────────────────────

export const getDeliveryConversations = async (req: Request, res: Response) => {
    try {
        const riderId = req.deliveryPartnerId!;

        const conversations = await prisma.conversation.findMany({
            where: {
                deliveryPartnerId: riderId,
                type: ConversationType.DELIVERY_ADMIN
            },
            orderBy: { lastMessageAt: "desc" },
            include: {
                assignedAdmin: { select: { firstName: true, lastName: true } },
                messages: {
                    where: { isInternal: false, ...getMessageRetentionFilter() },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { id: true, message: true, senderType: true, senderName: true, createdAt: true }
                },
                readReceipts: {
                    where: { readerType: "DELIVERY_PARTNER", readerId: riderId },
                    take: 1
                }
            }
        });

        const formatted = await Promise.all(
            conversations.map(async (c) => {
                const lastReadAt = c.readReceipts[0]?.lastReadAt || new Date(0);
                const cutoff = getRetentionCutoffDate();
                const effectiveReadAt = lastReadAt > cutoff ? lastReadAt : cutoff;
                const unreadCount = await prisma.conversationMessage.count({
                    where: {
                        conversationId: c.id,
                        isInternal: false,
                        senderType: { not: MessageSenderType.DELIVERY_PARTNER },
                        createdAt: { gt: effectiveReadAt }
                    }
                });

                return {
                    id: c.id,
                    subject: c.subject,
                    status: c.status,
                    priority: c.priority,
                    relatedEntityType: c.relatedEntityType,
                    relatedEntityId: c.relatedEntityId,
                    lastMessageAt: c.lastMessageAt,
                    createdAt: c.createdAt,
                    lastMessage: c.messages[0] || null,
                    unreadCount
                };
            })
        );

        return res.status(200).json({ success: true, conversations: formatted });
    } catch (error: any) {
        console.error("GET DELIVERY CONVERSATIONS ERROR:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to fetch conversations" });
    }
};

// ─── POST /api/delivery/conversations ────────────────────────────────────────

export const startDeliveryConversation = async (req: Request, res: Response) => {
    try {
        const riderId = req.deliveryPartnerId!;
        const { subject, initialMessage, deliveryId, orderId, relatedEntityType, relatedEntityId, attachments = [] } = req.body;

        const rider = await prisma.deliveryPartner.findUnique({
            where: { id: riderId },
            select: { firstName: true, lastName: true }
        });

        const senderName = rider ? `${rider.firstName || "Rider"} ${rider.lastName || ""}`.trim() : "Rider";

        const resolvedEntityType = relatedEntityType || (deliveryId ? "DELIVERY" : orderId ? "ORDER" : null);
        const resolvedEntityId = relatedEntityId || deliveryId || orderId || null;

        const { conversation, firstMessage } = await prisma.$transaction(async (tx) => {
            const conv = await tx.conversation.create({
                data: {
                    type: ConversationType.DELIVERY_ADMIN,
                    deliveryPartnerId: riderId,
                    subject: subject ? subject.trim() : "Delivery Support Inquiry",
                    relatedEntityType: resolvedEntityType,
                    relatedEntityId: resolvedEntityId,
                    status: ConversationStatus.OPEN,
                    lastMessageAt: new Date()
                }
            });

            let msg = null;
            if (initialMessage || (attachments && attachments.length > 0)) {
                msg = await tx.conversationMessage.create({
                    data: {
                        conversationId: conv.id,
                        senderType: MessageSenderType.DELIVERY_PARTNER,
                        senderId: riderId,
                        senderName,
                        message: initialMessage ? initialMessage.trim() : "",
                        attachments: Array.isArray(attachments) ? attachments : [],
                        isInternal: false
                    }
                });
            }

            return { conversation: conv, firstMessage: msg };
        });

        // Auto-subscribe the rider's active WebSocket to the new conversation
        subscribeActorToConversation("DELIVERY_PARTNER", riderId, conversation.id);

        // Broadcast to admins
        broadcastToAdmins({
            type: "admin_conversation_update",
            conversationId: conversation.id,
            conversationType: ConversationType.DELIVERY_ADMIN,
            lastMessage: firstMessage,
            lastMessageAt: conversation.lastMessageAt
        });
        broadcastToAdmins({
            type: "unread_counts_update",
            conversationId: conversation.id
        });

        return res.status(201).json({ success: true, conversation });
    } catch (error: any) {
        console.error("START DELIVERY CONVERSATION ERROR:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to start conversation" });
    }
};

// ─── GET /api/delivery/conversations/:id/messages ─────────────────────────────

export const getDeliveryConversationMessages = async (req: Request, res: Response) => {
    try {
        const riderId = req.deliveryPartnerId!;
        const id = String(req.params.id);

        const conv = await prisma.conversation.findUnique({
            where: { id },
            select: { id: true, deliveryPartnerId: true, subject: true, status: true }
        });

        if (!conv || conv.deliveryPartnerId !== riderId) {
            return res.status(403).json({ message: "Unauthorized for this conversation" });
        }

        const messages = await prisma.conversationMessage.findMany({
            where: {
                conversationId: id,
                isInternal: false,
                ...getMessageRetentionFilter()
            },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                senderType: true,
                senderId: true,
                senderName: true,
                message: true,
                attachments: true,
                clientMessageId: true,
                createdAt: true
            }
        });

        // Mark as read
        await prisma.conversationReadReceipt.upsert({
            where: {
                conversationId_readerType_readerId: {
                    conversationId: id,
                    readerType: "DELIVERY_PARTNER",
                    readerId: riderId
                }
            },
            update: { lastReadAt: new Date() },
            create: {
                conversationId: id,
                readerType: "DELIVERY_PARTNER",
                readerId: riderId,
                lastReadAt: new Date()
            }
        });

        return res.status(200).json({ success: true, conversation: { ...conv, messages }, messages });
    } catch (error: any) {
        console.error("GET DELIVERY MESSAGES ERROR:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to fetch messages" });
    }
};

// ─── POST /api/delivery/conversations/:id/messages ────────────────────────────

export const sendDeliveryMessage = async (req: Request, res: Response) => {
    try {
        const riderId = req.deliveryPartnerId!;
        const id = String(req.params.id);
        const { message, attachments = [], clientMessageId } = req.body;

        const conv = await prisma.conversation.findUnique({
            where: { id },
            select: { id: true, deliveryPartnerId: true, status: true }
        });

        if (!conv || conv.deliveryPartnerId !== riderId) {
            return res.status(403).json({ message: "Unauthorized for this conversation" });
        }

        if (!message && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ message: "Message or attachment is required" });
        }

        // Idempotency check: if message with this clientMessageId was already saved, return it safely
        if (clientMessageId) {
            const existing = await prisma.conversationMessage.findFirst({
                where: { conversationId: id, clientMessageId }
            });
            if (existing) {
                return res.status(200).json({ success: true, message: existing });
            }
        }

        const rider = await prisma.deliveryPartner.findUnique({
            where: { id: riderId },
            select: { firstName: true, lastName: true }
        });

        const senderName = rider ? `${rider.firstName || "Rider"} ${rider.lastName || ""}`.trim() : "Rider";

        const savedMessage = await prisma.$transaction(async (tx) => {
            const msg = await tx.conversationMessage.create({
                data: {
                    conversationId: id,
                    senderType: MessageSenderType.DELIVERY_PARTNER,
                    senderId: riderId,
                    senderName,
                    message: message ? message.trim() : "",
                    attachments: Array.isArray(attachments) ? attachments : [],
                    clientMessageId: clientMessageId || null,
                    isInternal: false
                }
            });

            await tx.conversation.update({
                where: { id },
                data: {
                    lastMessageAt: new Date(),
                    status: conv.status === "RESOLVED" ? ConversationStatus.OPEN : conv.status
                }
            });

            return msg;
        });

        broadcastToConversation(id, {
            type: "new_message",
            conversationId: id,
            message: savedMessage
        }, false);

        broadcastToAdmins({
            type: "admin_conversation_update",
            conversationId: id,
            conversationType: ConversationType.DELIVERY_ADMIN,
            lastMessage: savedMessage,
            lastMessageAt: savedMessage.createdAt
        });
        broadcastToAdmins({
            type: "unread_counts_update",
            conversationId: id
        });

        return res.status(201).json({ success: true, message: savedMessage });
    } catch (error: any) {
        console.error("SEND DELIVERY MESSAGE ERROR:", error);
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/delivery/conversations/:id/read ────────────────────────────────

export const markDeliveryConversationRead = async (req: Request, res: Response) => {
    try {
        const riderId = req.deliveryPartnerId!;
        const id = String(req.params.id);

        const conv = await prisma.conversation.findUnique({
            where: { id },
            select: { deliveryPartnerId: true }
        });
        if (!conv || conv.deliveryPartnerId !== riderId) {
            return res.status(403).json({ message: "Unauthorized for this conversation" });
        }

        await prisma.conversationReadReceipt.upsert({
            where: {
                conversationId_readerType_readerId: {
                    conversationId: id,
                    readerType: "DELIVERY_PARTNER",
                    readerId: riderId
                }
            },
            update: { lastReadAt: new Date() },
            create: {
                conversationId: id,
                readerType: "DELIVERY_PARTNER",
                readerId: riderId,
                lastReadAt: new Date()
            }
        });

        broadcastReadReceipt(id, "DELIVERY_PARTNER", riderId).catch(() => {});

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error("MARK DELIVERY READ ERROR:", error);
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

// ─── Delivery Support Compatibility Endpoints ────────────────────────────────
// Supports web client calling GET /api/delivery/support/conversation and POST /api/delivery/support/messages

export const getOrCreateSupportConversation = async (req: Request, res: Response) => {
    try {
        const riderId = req.deliveryPartnerId!;

        // Find active conversation or create one
        let conv = await prisma.conversation.findFirst({
            where: {
                deliveryPartnerId: riderId,
                type: ConversationType.DELIVERY_ADMIN,
                status: { not: ConversationStatus.RESOLVED }
            },
            orderBy: { lastMessageAt: "desc" },
            include: {
                messages: {
                    where: { isInternal: false, ...getMessageRetentionFilter() },
                    orderBy: { createdAt: "asc" }
                }
            }
        });

        if (!conv) {
            conv = await prisma.conversation.create({
                data: {
                    type: ConversationType.DELIVERY_ADMIN,
                    deliveryPartnerId: riderId,
                    subject: "Delivery Support Inquiry",
                    status: ConversationStatus.OPEN,
                    lastMessageAt: new Date()
                },
                include: {
                    messages: {
                        where: { isInternal: false, ...getMessageRetentionFilter() },
                        orderBy: { createdAt: "asc" }
                    }
                }
            });
            subscribeActorToConversation("DELIVERY_PARTNER", riderId, conv.id);
        }

        return res.status(200).json({ success: true, conversation: conv });
    } catch (error: any) {
        console.error("GET OR CREATE SUPPORT CONVERSATION ERROR:", error);
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};

export const sendSupportMessage = async (req: Request, res: Response) => {
    try {
        const riderId = req.deliveryPartnerId!;
        const { conversationId, message, attachments = [], clientMessageId } = req.body;

        let targetConvId = conversationId;
        if (!targetConvId) {
            const active = await prisma.conversation.findFirst({
                where: {
                    deliveryPartnerId: riderId,
                    type: ConversationType.DELIVERY_ADMIN
                },
                orderBy: { lastMessageAt: "desc" }
            });
            if (!active) {
                return res.status(400).json({ message: "No active conversation found" });
            }
            targetConvId = active.id;
        }

        req.params.id = targetConvId;
        return sendDeliveryMessage(req, res);
    } catch (error: any) {
        console.error("SEND SUPPORT MESSAGE ERROR:", error);
        return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
