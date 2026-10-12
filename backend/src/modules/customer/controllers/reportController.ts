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

        const {
            targetType = "SELLER",
            targetId,
            orderId,
            productId,
            sellerId,
            shopId,
            category,
            reason,
            description,
            attachments = [],
            attachmentUrls = []
        } = req.body;

        if (!category || !reason || !description) {
            return res.status(400).json({ message: "category, reason, and description are required." });
        }

        let resolvedTargetType = targetType as ReportTargetType;
        let resolvedTargetId = targetId;

        if (orderId || resolvedTargetType === "ORDER") {
            resolvedTargetType = ReportTargetType.ORDER;
            const orderRef = String(orderId || targetId);

            // AUTHORIZATION CHECK: Order must belong to this customer
            const customerOrder = await prisma.order.findFirst({
                where: {
                    customerId,
                    OR: [
                        { id: orderRef },
                        { orderNumber: orderRef }
                    ]
                }
            });
            if (!customerOrder) {
                return res.status(403).json({
                    message: "You can only report orders that belong to your account."
                });
            }
            resolvedTargetId = customerOrder.id;
        } else if (productId || resolvedTargetType === "PRODUCT") {
            resolvedTargetType = ReportTargetType.PRODUCT;
            resolvedTargetId = String(productId || targetId);
            const product = await prisma.product.findUnique({
                where: { id: resolvedTargetId }
            });
            if (!product) {
                return res.status(404).json({ message: "Product not found." });
            }
        } else if (shopId || resolvedTargetType === "SHOP") {
            resolvedTargetType = ReportTargetType.SHOP;
            resolvedTargetId = String(shopId || targetId);
        } else if (sellerId || resolvedTargetType === "SELLER") {
            resolvedTargetType = ReportTargetType.SELLER;
            resolvedTargetId = String(sellerId || targetId);
        }

        if (!resolvedTargetId) {
            return res.status(400).json({ message: "A valid target (Order, Product, or Seller) must be selected." });
        }

        const finalAttachments = Array.isArray(attachmentUrls) && attachmentUrls.length > 0
            ? attachmentUrls
            : (Array.isArray(attachments) ? attachments : []);

        const reportNumber = `REP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const report = await prisma.$transaction(async (tx) => {
            const rep = await tx.customerCaseReport.create({
                data: {
                    reportNumber,
                    customerId,
                    targetType: resolvedTargetType,
                    targetId: String(resolvedTargetId),
                    category: category.trim(),
                    reason: reason.trim(),
                    description: description.trim(),
                    attachments: finalAttachments,
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
