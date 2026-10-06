import type { Request, Response } from "express";
import { AdminActionType, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";

const isTicketStatus = (value: unknown): value is SupportTicketStatus =>
    typeof value === "string" &&
    (Object.values(SupportTicketStatus) as string[]).includes(value);

const isTicketPriority = (value: unknown): value is SupportTicketPriority =>
    typeof value === "string" &&
    (Object.values(SupportTicketPriority) as string[]).includes(value);

const ticketRelations = {
    customer: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true
        }
    },
    seller: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            shop: { select: { id: true, name: true } }
        }
    },
    order: { select: { id: true, orderNumber: true, status: true } },
    assignedToAdmin: {
        select: { id: true, firstName: true, lastName: true, email: true }
    }
} satisfies Prisma.SupportTicketInclude;

export const getTickets = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const status =
            typeof req.query.status === "string" && req.query.status
                ? req.query.status
                : undefined;
        if (status !== undefined && !isTicketStatus(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const priority =
            typeof req.query.priority === "string" && req.query.priority
                ? req.query.priority
                : undefined;
        if (priority !== undefined && !isTicketPriority(priority)) {
            return res.status(400).json({ message: "Invalid priority" });
        }

        const search =
            typeof req.query.search === "string" ? req.query.search.trim() : "";

        const where: Prisma.SupportTicketWhereInput = {
            ...(status ? { status: status as SupportTicketStatus } : {}),
            ...(priority ? { priority: priority as SupportTicketPriority } : {}),
            ...(search
                ? {
                      OR: [
                          { subject: { contains: search, mode: "insensitive" } },
                          { ticketNumber: { contains: search, mode: "insensitive" } }
                      ]
                  }
                : {})
        };

        const [tickets, total] = await prisma.$transaction([
            prisma.supportTicket.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                include: { ...ticketRelations, _count: { select: { messages: true } } }
            }),
            prisma.supportTicket.count({ where })
        ]);

        return res.status(200).json({
            tickets,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET SUPPORT TICKETS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getTicket = async (req: Request, res: Response) => {
    try {
        const ticketId = String(req.params.id);

        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId },
            include: {
                ...ticketRelations,
                messages: {
                    orderBy: { createdAt: "asc" },
                    select: {
                        id: true,
                        ticketId: true,
                        senderType: true,
                        senderId: true,
                        message: true,
                        attachments: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!ticket) return res.status(404).json({ message: "Support ticket not found." });

        return res.status(200).json({ ticket });
    } catch (error: any) {
        console.error("GET SUPPORT TICKET ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const addTicketMessage = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const ticketId = String(req.params.id);

        const message =
            typeof req.body.message === "string" ? req.body.message.trim() : "";
        if (!message) return res.status(400).json({ message: "Message is required" });
        if (message.length > 5000) {
            return res
                .status(400)
                .json({ message: "Message must be 5000 characters or fewer" });
        }

        const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
        if (!ticket) return res.status(404).json({ message: "Support ticket not found." });

        const reply = await prisma.supportTicketMessage.create({
            data: {
                ticketId: ticket.id,
                senderType: "ADMIN",
                senderId: adminId,
                message
            }
        });

        const patch: { assignedToAdminId?: string; status?: SupportTicketStatus } = {};
        if (!ticket.assignedToAdminId) patch.assignedToAdminId = adminId;
        if (ticket.status === "OPEN") patch.status = "IN_PROGRESS";

        if (Object.keys(patch).length > 0) {
            await prisma.supportTicket.update({ where: { id: ticket.id }, data: patch });
        }

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SUPPORT_TICKET_REPLIED,
            targetType: "SupportTicket",
            targetId: ticket.id,
            description: `Admin replied to ticket ${ticket.ticketNumber ?? ticket.id}`,
            previousValue: {
                status: ticket.status,
                assignedToAdminId: ticket.assignedToAdminId
            },
            newValue: { status: patch.status ?? ticket.status, assignedToAdminId: adminId },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(201).json({ reply });
    } catch (error: any) {
        console.error("REPLY SUPPORT TICKET ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateTicket = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const ticketId = String(req.params.id);
        const { status, priority } = req.body;

        if (status === undefined && priority === undefined) {
            return res.status(400).json({ message: "status or priority is required" });
        }
        if (status !== undefined && !isTicketStatus(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        if (priority !== undefined && !isTicketPriority(priority)) {
            return res.status(400).json({ message: "Invalid priority" });
        }

        const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
        if (!ticket) return res.status(404).json({ message: "Support ticket not found." });

        const data: Prisma.SupportTicketUpdateInput = {};
        if (status !== undefined) {
            data.status = status as SupportTicketStatus;
            if (status === "RESOLVED") data.resolvedAt = new Date();
            if (status === "CLOSED") data.closedAt = new Date();
        }
        if (priority !== undefined) data.priority = priority as SupportTicketPriority;

        const updated = await prisma.supportTicket.update({
            where: { id: ticketId },
            data
        });

        await logAdminAction({
            adminId,
            actionType:
                status === "RESOLVED"
                    ? AdminActionType.SUPPORT_TICKET_RESOLVED
                    : AdminActionType.SUPPORT_TICKET_REPLIED,
            targetType: "SupportTicket",
            targetId: ticket.id,
            description:
                status === "RESOLVED"
                    ? `Ticket ${ticket.ticketNumber ?? ticket.id} resolved`
                    : `Ticket ${ticket.ticketNumber ?? ticket.id} updated (status: ${ticket.status} -> ${updated.status}, priority: ${ticket.priority} -> ${updated.priority})`,
            previousValue: { status: ticket.status, priority: ticket.priority },
            newValue: { status: updated.status, priority: updated.priority },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ ticket: updated });
    } catch (error: any) {
        console.error("UPDATE SUPPORT TICKET ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
