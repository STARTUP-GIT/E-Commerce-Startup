import type { Request, Response } from "express";
import { ConversationType, ConversationStatus, MessageSenderType } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { broadcastToConversation } from "../../../services/chat/chat.service.js";

// ─── GET /customer/api/conversations ─────────────────────────────────────────

export const getCustomerConversations = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId!;

        const conversations = await prisma.conversation.findMany({
            where: {
                customerId,
                type: ConversationType.CUSTOMER_ADMIN
            },
            orderBy: { lastMessageAt: "desc" },
            include: {
                assignedAdmin: { select: { firstName: true, lastName: true } },
                messages: {
                    where: { isInternal: false },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { id: true, message: true, senderType: true, senderName: true, createdAt: true }
                },
                readReceipts: {
                    where: { readerType: "CUSTOMER", readerId: customerId },
                    take: 1
                }
            }
        });

        const formatted = await Promise.all(
            conversations.map(async (c) => {
                const lastReadAt = c.readReceipts[0]?.lastReadAt || new Date(0);
                const unreadCount = await prisma.conversationMessage.count({
                    where: {
                        conversationId: c.id,
                        isInternal: false,
                        senderType: { not: MessageSenderType.CUSTOMER },
                        createdAt: { gt: lastReadAt }
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

        return res.status(200).json({ conversations: formatted });
    } catch (error: any) {
        console.error("GET CUSTOMER CONVERSATIONS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /customer/api/conversations ────────────────────────────────────────

export const startCustomerConversation = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId!;
        const { subject, relatedEntityType, relatedEntityId, initialMessage, attachments = [] } = req.body;

        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { firstName: true, lastName: true }
        });

        const senderName = customer ? `${customer.firstName || "Customer"} ${customer.lastName || ""}`.trim() : "Customer";

        const conversation = await prisma.$transaction(async (tx) => {
            const conv = await tx.conversation.create({
                data: {
                    type: ConversationType.CUSTOMER_ADMIN,
                    customerId,
                    subject: subject ? subject.trim() : "Customer Support",
                    relatedEntityType: relatedEntityType || null,
                    relatedEntityId: relatedEntityId || null,
                    status: ConversationStatus.OPEN,
                    lastMessageAt: new Date()
                }
            });

            if (initialMessage || (attachments && attachments.length > 0)) {
                await tx.conversationMessage.create({
                    data: {
                        conversationId: conv.id,
                        senderType: MessageSenderType.CUSTOMER,
                        senderId: customerId,
                        senderName,
                        message: initialMessage ? initialMessage.trim() : "",
                        attachments: Array.isArray(attachments) ? attachments : [],
                        isInternal: false
                    }
                });
            }

            return conv;
        });

        return res.status(201).json({ conversation });
    } catch (error: any) {
        console.error("START CUSTOMER CONVERSATION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /customer/api/conversations/:id/messages ─────────────────────────────

export const getCustomerConversationMessages = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId!;
        const id = String(req.params.id);

        const conv = await prisma.conversation.findUnique({
            where: { id },
            select: { id: true, customerId: true, subject: true, status: true }
        });

        if (!conv || conv.customerId !== customerId) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        const messages = await prisma.conversationMessage.findMany({
            where: {
                conversationId: id,
                isInternal: false
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
                    readerType: "CUSTOMER",
                    readerId: customerId
                }
            },
            update: { lastReadAt: new Date() },
            create: {
                conversationId: id,
                readerType: "CUSTOMER",
                readerId: customerId,
                lastReadAt: new Date()
            }
        });

        return res.status(200).json({ conversation: conv, messages });
    } catch (error: any) {
        console.error("GET CUSTOMER MESSAGES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /customer/api/conversations/:id/messages ────────────────────────────

export const sendCustomerMessage = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId!;
        const id = String(req.params.id);
        const { message, attachments = [], clientMessageId } = req.body;

        const conv = await prisma.conversation.findUnique({
            where: { id },
            select: { id: true, customerId: true, status: true }
        });

        if (!conv || conv.customerId !== customerId) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        if (!message && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ message: "Message or attachment is required" });
        }

        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: { firstName: true, lastName: true }
        });

        const senderName = customer ? `${customer.firstName || "Customer"} ${customer.lastName || ""}`.trim() : "Customer";

        const savedMessage = await prisma.$transaction(async (tx) => {
            const msg = await tx.conversationMessage.create({
                data: {
                    conversationId: id,
                    senderType: MessageSenderType.CUSTOMER,
                    senderId: customerId,
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

        return res.status(201).json({ message: savedMessage });
    } catch (error: any) {
        console.error("SEND CUSTOMER MESSAGE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /customer/api/conversations/:id/read ────────────────────────────────

export const markCustomerConversationRead = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId!;
        const id = String(req.params.id);

        await prisma.conversationReadReceipt.upsert({
            where: {
                conversationId_readerType_readerId: {
                    conversationId: id,
                    readerType: "CUSTOMER",
                    readerId: customerId
                }
            },
            update: { lastReadAt: new Date() },
            create: {
                conversationId: id,
                readerType: "CUSTOMER",
                readerId: customerId,
                lastReadAt: new Date()
            }
        });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error("MARK CUSTOMER READ ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
