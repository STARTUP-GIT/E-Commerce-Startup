import type { Request, Response } from "express";
import { CaseReportStatus, ReportTargetType, SupportTicketPriority } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";

// ─── POST /customer/api/reports ───────────────────────────────────────────────

export const createCustomerReport = async (req: Request, res: Response) => {
    try {
        const customerId = (req as any).customerId;
        if (!customerId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const { targetType = "SELLER", targetId, category, reason, description, attachments = [] } = req.body;

        if (!targetId || !category || !reason || !description) {
            return res.status(400).json({ message: "targetId, category, reason, and description are required." });
        }

        const reportNumber = `REP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const report = await prisma.$transaction(async (tx) => {
            const rep = await tx.customerCaseReport.create({
                data: {
                    reportNumber,
                    customerId,
                    targetType: targetType as ReportTargetType,
                    targetId: String(targetId),
                    category: category.trim(),
                    reason: reason.trim(),
                    description: description.trim(),
                    attachments: Array.isArray(attachments) ? attachments : [],
                    status: CaseReportStatus.PENDING,
                    priority: SupportTicketPriority.MEDIUM,
                    receivedAt: new Date()
                }
            });

            await tx.reportTimelineEvent.create({
                data: {
                    reportId: rep.id,
                    actorType: "CUSTOMER",
                    actorId: customerId,
                    eventType: "REPORT_RECEIVED",
                    note: `Report filed under category: ${category.trim()}`
                }
            });

            return rep;
        });

        return res.status(201).json({ report, message: "Report received and queued for investigation." });
    } catch (error: any) {
        console.error("CREATE CUSTOMER REPORT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /customer/api/reports ────────────────────────────────────────────────

export const getMyCustomerReports = async (req: Request, res: Response) => {
    try {
        const customerId = (req as any).customerId;
        if (!customerId) return res.status(401).json({ message: "Authentication required" });

        const reports = await prisma.customerCaseReport.findMany({
            where: { customerId },
            orderBy: { receivedAt: "desc" },
            select: {
                id: true,
                reportNumber: true,
                targetType: true,
                targetId: true,
                category: true,
                reason: true,
                status: true,
                receivedAt: true,
                resolution: true
            }
        });

        return res.status(200).json({ reports });
    } catch (error: any) {
        console.error("GET MY REPORTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
