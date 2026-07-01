import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";

export const getReportedProducts = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [reports, total] = await prisma.$transaction([
            prisma.productReport.findMany({
                where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
                include: {
                    product: { select: { id: true, name: true, sellerId: true } },
                    customer: { select: { id: true, username: true, email: true } }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.productReport.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } })
        ]);

        return res.status(200).json({
            reports,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (error: any) {
        console.error("GET REPORTED PRODUCTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getReportedShops = async (req: Request, res: Response) => {
    try {
        const reports = await prisma.productReport.findMany({
            where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
            include: {
                product: {
                    include: {
                        seller: { include: { shop: true } }
                    }
                },
                customer: { select: { id: true, username: true, email: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        const shopReports = reports.filter(r => r.product?.seller?.shop);

        return res.status(200).json({ shopReports });
    } catch (error: any) {
        console.error("GET REPORTED SHOPS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const resolveReport = async (req: Request, res: Response) => {
    try {
        const reportId = String(req.params.id);
        const adminId = req.adminId!;
        const { resolution } = req.body;

        const report = await prisma.productReport.findUnique({ where: { id: reportId } });
        if (!report) return res.status(404).json({ message: "Report not found" });

        const updatedReport = await prisma.productReport.update({
            where: { id: reportId },
            data: {
                status: "RESOLVED",
                resolution: resolution || "Reviewed and resolved by admin",
                reviewedByAdminId: adminId,
                reviewedAt: new Date()
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.PRODUCT_REPORT_REVIEWED,
            targetType: "ProductReport",
            targetId: reportId,
            description: `Report ${reportId} resolved by admin. Resolution: ${resolution}`,
            previousValue: { status: report.status },
            newValue: { status: "RESOLVED" }
        });

        return res.status(200).json({ message: "Report resolved successfully", report: updatedReport });
    } catch (error: any) {
        console.error("RESOLVE REPORT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deleteReport = async (req: Request, res: Response) => {
    try {
        const reportId = String(req.params.id);
        const adminId = req.adminId!;

        const report = await prisma.productReport.findUnique({ where: { id: reportId } });
        if (!report) return res.status(404).json({ message: "Report not found" });

        await prisma.productReport.delete({ where: { id: reportId } });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.PRODUCT_REPORT_REVIEWED,
            targetType: "ProductReport",
            targetId: reportId,
            description: `Report ${reportId} deleted by admin.`,
            previousValue: { status: report.status },
            newValue: null
        });

        return res.status(200).json({ message: "Report deleted successfully" });
    } catch (error: any) {
        console.error("DELETE REPORT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
