import type { Request, Response } from "express";
import { ConversationType, ConversationStatus, MessageSenderType, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { broadcastToConversation } from "../../../services/chat/chat.service.js";

// ─── GET /api/admin/conversations ─────────────────────────────────────────────

export const getConversations = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const type = typeof req.query.type === "string" && req.query.type
            ? (req.query.type as ConversationType)
            : undefined;
        const status = typeof req.query.status === "string" && req.query.status
            ? (req.query.status as ConversationStatus)
            : undefined;
        const search = typeof req.query.search === "string" && req.query.search.trim()
            ? req.query.search.trim()
            : undefined;

        const where: Prisma.ConversationWhereInput = {
            ...(type ? { type } : {}),
            ...(status ? { status } : {}),
            ...(search
                ? {
                      OR: [
                          { subject: { contains: search, mode: "insensitive" } },
                          { customer: { firstName: { contains: search, mode: "insensitive" } } },
                          { customer: { lastName: { contains: search, mode: "insensitive" } } },
                          { customer: { email: { contains: search, mode: "insensitive" } } },
                          { seller: { firstName: { contains: search, mode: "insensitive" } } },
                          { seller: { lastName: { contains: search, mode: "insensitive" } } },
                          { seller: { shop: { name: { contains: search, mode: "insensitive" } } } }
                      ]
                  }
                : {})
        };

        const [conversations, total] = await prisma.$transaction([
            prisma.conversation.findMany({
                where,
                orderBy: { lastMessageAt: "desc" },
                skip,
                take: limit,
                include: {
                    customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                    seller: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            shop: { select: { id: true, name: true } }
                        }
                    },
                    assignedAdmin: { select: { id: true, firstName: true, lastName: true } },
                    messages: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: { id: true, message: true, senderType: true, senderName: true, createdAt: true, isInternal: true }
                    },
                    _count: {
                        select: {
                            messages: true
                        }
                    }
                }
            }),
            prisma.conversation.count({ where })
        ]);

        return res.status(200).json({
            conversations,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET ADMIN CONVERSATIONS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/conversations/:id ─────────────────────────────────────────

export const getConversationDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);

        const conversation = await prisma.conversation.findUnique({
            where: { id },
            include: {
                customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                seller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        shop: { select: { id: true, name: true } }
                    }
                },
                assignedAdmin: { select: { id: true, firstName: true, lastName: true } },
                messages: {
                    orderBy: { createdAt: "asc" }
                },
                readReceipts: true
            }
        });

        if (!conversation) return res.status(404).json({ message: "Conversation not found" });

        return res.status(200).json({ conversation });
    } catch (error: any) {
        console.error("GET CONVERSATION DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/conversations/:id/messages ───────────────────────────────

export const sendAdminMessage = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);
        const { message, attachments = [], isInternal = false, clientMessageId } = req.body;

        if (!message && (!attachments || attachments.length === 0)) {
            return res.status(400).json({ message: "Message or attachment is required" });
        }

        // Idempotency check: if message with this clientMessageId was already saved, return it safely
        if (clientMessageId) {
            const existing = await prisma.conversationMessage.findFirst({
                where: { conversationId: id, clientMessageId }
            });
            if (existing) {
                return res.status(200).json({ message: existing });
            }
        }

        const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            select: { firstName: true, lastName: true }
        });

        const senderName = admin ? `${admin.firstName || "Admin"} ${admin.lastName || ""}`.trim() : "Support Agent";

        const savedMessage = await prisma.$transaction(async (tx) => {
            const msg = await tx.conversationMessage.create({
                data: {
                    conversationId: id,
                    senderType: MessageSenderType.ADMIN,
                    senderId: adminId,
                    senderName,
                    message: message ? message.trim() : "",
                    attachments: Array.isArray(attachments) ? attachments : [],
                    clientMessageId: clientMessageId || null,
                    isInternal: Boolean(isInternal)
                }
            });

            await tx.conversation.update({
                where: { id },
                data: {
                    lastMessageAt: new Date(),
                    status: ConversationStatus.PENDING
                }
            });

            return msg;
        });

        broadcastToConversation(id, {
            type: "new_message",
            conversationId: id,
            message: savedMessage
        }, Boolean(isInternal));

        return res.status(201).json({ message: savedMessage });
    } catch (error: any) {
        console.error("SEND ADMIN MESSAGE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── PATCH /api/admin/conversations/:id/status ────────────────────────────────

export const updateConversationStatus = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { status } = req.body;

        if (!status || !Object.values(ConversationStatus).includes(status)) {
            return res.status(400).json({ message: "Valid status is required" });
        }

        const updated = await prisma.conversation.update({
            where: { id },
            data: { status: status as ConversationStatus }
        });

        return res.status(200).json({ conversation: updated });
    } catch (error: any) {
        console.error("UPDATE CONVERSATION STATUS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── PATCH /api/admin/conversations/:id/assign ────────────────────────────────

export const assignConversation = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { adminId } = req.body;

        const updated = await prisma.conversation.update({
            where: { id },
            data: { assignedAdminId: adminId || null }
        });

        return res.status(200).json({ conversation: updated });
    } catch (error: any) {
        console.error("ASSIGN CONVERSATION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── PATCH /api/admin/conversations/:id/notes ─────────────────────────────────

export const updateConversationNotes = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { internalNotes } = req.body;

        const updated = await prisma.conversation.update({
            where: { id },
            data: { internalNotes: internalNotes ? internalNotes.trim() : null }
        });

        return res.status(200).json({ conversation: updated });
    } catch (error: any) {
        console.error("UPDATE CONVERSATION NOTES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
