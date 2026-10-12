import type { Request, Response } from "express";
import {
    AdminActionType,
    CaseReportStatus,
    Prisma,
    SupportTicketPriority
} from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";

// ─── GET /api/admin/cases ─────────────────────────────────────────────────────

export const getCaseReports = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const status = typeof req.query.status === "string" && req.query.status ? (req.query.status as CaseReportStatus) : undefined;
        const priority = typeof req.query.priority === "string" && req.query.priority ? (req.query.priority as SupportTicketPriority) : undefined;
        const category = typeof req.query.category === "string" && req.query.category ? req.query.category : undefined;
        const search = typeof req.query.search === "string" && req.query.search.trim() ? req.query.search.trim() : undefined;

        const where: Prisma.CustomerCaseReportWhereInput = {
            ...(status ? { status } : {}),
            ...(priority ? { priority } : {}),
            ...(category ? { category } : {}),
            ...(search
                ? {
                      OR: [
                          { reportNumber: { contains: search, mode: "insensitive" } },
                          { reason: { contains: search, mode: "insensitive" } },
                          { description: { contains: search, mode: "insensitive" } },
                          { customer: { firstName: { contains: search, mode: "insensitive" } } },
                          { customer: { lastName: { contains: search, mode: "insensitive" } } },
                          { customer: { email: { contains: search, mode: "insensitive" } } }
                      ]
                  }
                : {})
        };

        const [cases, total, pendingCount, investigatingCount, resolvedCount] = await prisma.$transaction([
            prisma.customerCaseReport.findMany({
                where,
                orderBy: { receivedAt: "desc" },
                skip,
                take: limit,
                include: {
                    customer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    },
                    assignedAdmin: { select: { id: true, firstName: true, lastName: true } },
                    _count: { select: { timeline: true } }
                }
            }),
            prisma.customerCaseReport.count({ where }),
            prisma.customerCaseReport.count({ where: { status: CaseReportStatus.PENDING } }),
            prisma.customerCaseReport.count({ where: { status: CaseReportStatus.INVESTIGATING } }),
            prisma.customerCaseReport.count({ where: { status: CaseReportStatus.RESOLVED } })
        ]);

        return res.status(200).json({
            cases,
            summary: { total, pendingCount, investigatingCount, resolvedCount },
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET CASE REPORTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/cases/:id ─────────────────────────────────────────────────

export const getCaseReportDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);

        const caseItem = await prisma.customerCaseReport.findUnique({
            where: { id },
            include: {
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        createdAt: true
                    }
                },
                assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
                timeline: { orderBy: { createdAt: "asc" } }
            }
        });

        if (!caseItem) return res.status(404).json({ message: "Case report not found" });

        // Also fetch related seller/product/order details if target matches
        let targetDetails: any = null;
        if (caseItem.targetType === "SELLER") {
            targetDetails = await prisma.seller.findUnique({
                where: { id: caseItem.targetId },
                include: { shop: true }
            });
        } else if (caseItem.targetType === "PRODUCT") {
            targetDetails = await prisma.product.findUnique({
                where: { id: caseItem.targetId },
                include: { seller: { include: { shop: true } } }
            });
        } else if (caseItem.targetType === "ORDER") {
            targetDetails = await prisma.order.findUnique({
                where: { id: caseItem.targetId },
                include: { sellerOrders: { include: { seller: true } } }
            });
        }

        return res.status(200).json({ caseItem, targetDetails });
    } catch (error: any) {
        console.error("GET CASE REPORT DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/cases/:id/timeline ───────────────────────────────────────

export const addCaseTimelineEvent = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);
        const { eventType = "INVESTIGATION_NOTE", note, isInternalNote = false } = req.body;

        if (!note || typeof note !== "string" || !note.trim()) {
            return res.status(400).json({ message: "Note content cannot be empty." });
        }

        const caseReport = await prisma.customerCaseReport.findUnique({ where: { id } });
        if (!caseReport) return res.status(404).json({ message: "Case report not found" });

        if (isInternalNote) {
            const updatedNotes = caseReport.internalNotes
                ? `${caseReport.internalNotes}\n\n[${new Date().toISOString()} - Admin ${adminId}]: ${note.trim()}`
                : `[${new Date().toISOString()} - Admin ${adminId}]: ${note.trim()}`;

            await prisma.customerCaseReport.update({
                where: { id },
                data: { internalNotes: updatedNotes }
            });
        }

        const event = await prisma.reportTimelineEvent.create({
            data: {
                reportId: id,
                actorType: "ADMIN",
                actorId: adminId,
                eventType: String(eventType),
                note: note.trim()
            }
        });

        return res.status(201).json({ event });
    } catch (error: any) {
        console.error("ADD TIMELINE EVENT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/cases/:id/resolve ────────────────────────────────────────

export const resolveCaseReport = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);
        const { status, resolution } = req.body;

        if (!status || !["RESOLVED", "DISMISSED", "ACTION_TAKEN"].includes(status)) {
            return res.status(400).json({ message: "status must be RESOLVED, DISMISSED, or ACTION_TAKEN" });
        }
        if (!resolution || typeof resolution !== "string" || !resolution.trim()) {
            return res.status(400).json({ message: "Resolution summary is required." });
        }

        const existing = await prisma.customerCaseReport.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "Case report not found" });

        const updated = await prisma.$transaction(async (tx) => {
            const resCase = await tx.customerCaseReport.update({
                where: { id },
                data: {
                    status: status as CaseReportStatus,
                    resolution: resolution.trim()
                }
            });

            await tx.reportTimelineEvent.create({
                data: {
                    reportId: id,
                    actorType: "ADMIN",
                    actorId: adminId,
                    eventType: `CASE_${status}`,
                    note: `Case status set to ${status}. Outcome: ${resolution.trim()}`
                }
            });

            return resCase;
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.CASE_REPORT_RESOLVED,
            targetType: "CustomerCaseReport",
            targetId: id,
            description: `Case report ${existing.reportNumber} resolved as ${status}: ${resolution.trim()}`,
            previousValue: { status: existing.status },
            newValue: { status: updated.status, resolution: updated.resolution },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ caseItem: updated });
    } catch (error: any) {
        console.error("RESOLVE CASE REPORT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
