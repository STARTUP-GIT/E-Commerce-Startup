import type { Request, Response } from "express";
import { AdminActionType, ReturnStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";

const isReturnStatus = (value: unknown): value is ReturnStatus =>
    typeof value === "string" && (Object.values(ReturnStatus) as string[]).includes(value);

/** Statuses from which the return can no longer be approved or rejected. */
const TERMINAL_STATUSES: ReturnStatus[] = [
    "REJECTED",
    "CANCELLED",
    "REFUNDED",
    "COMPLETED"
];

const returnInclude = {
    order: { select: { id: true, orderNumber: true, status: true, createdAt: true } },
    customer: {
        select: { id: true, firstName: true, lastName: true, username: true, email: true }
    },
    product: { select: { id: true, name: true, imageUrl: true, slug: true } },
    seller: { select: { id: true, firstName: true, lastName: true, email: true } },
    reviewedByAdmin: { select: { id: true, firstName: true, lastName: true, email: true } }
} satisfies Prisma.ReturnRequestInclude;

export const getReturns = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const status =
            typeof req.query.status === "string" && req.query.status
                ? req.query.status
                : undefined;
        if (status !== undefined && !isReturnStatus(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const search =
            typeof req.query.search === "string" ? req.query.search.trim() : "";

        const where: Prisma.ReturnRequestWhereInput = {
            ...(status ? { status: status as ReturnStatus } : {}),
            ...(search
                ? {
                      OR: [
                          { returnNumber: { contains: search, mode: "insensitive" } },
                          { order: { orderNumber: { contains: search, mode: "insensitive" } } }
                      ]
                  }
                : {})
        };

        const [returns, total] = await prisma.$transaction([
            prisma.returnRequest.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                include: returnInclude
            }),
            prisma.returnRequest.count({ where })
        ]);

        return res.status(200).json({
            returns,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET RETURNS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const approveReturn = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const returnId = String(req.params.id);
        const { adminNotes } = req.body;

        const existing = await prisma.returnRequest.findUnique({ where: { id: returnId } });
        if (!existing) return res.status(404).json({ message: "Return request not found." });

        if (TERMINAL_STATUSES.includes(existing.status)) {
            return res.status(409).json({
                message: `Return request is already ${existing.status} and can no longer be approved.`
            });
        }

        const returnRequest = await prisma.returnRequest.update({
            where: { id: returnId },
            data: {
                status: "APPROVED",
                reviewedByAdminId: adminId,
                reviewedAt: new Date(),
                ...(typeof adminNotes === "string" ? { adminNotes } : {})
            },
            include: returnInclude
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.RETURN_APPROVED,
            targetType: "ReturnRequest",
            targetId: returnRequest.id,
            description: `Return ${returnRequest.returnNumber} approved`,
            previousValue: { status: existing.status },
            newValue: { status: returnRequest.status, adminNotes: returnRequest.adminNotes },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ returnRequest });
    } catch (error: any) {
        console.error("APPROVE RETURN ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const rejectReturn = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const returnId = String(req.params.id);
        const { rejectionReason, adminNotes } = req.body;

        if (typeof rejectionReason !== "string" || !rejectionReason.trim()) {
            return res.status(400).json({ message: "rejectionReason is required" });
        }

        const existing = await prisma.returnRequest.findUnique({ where: { id: returnId } });
        if (!existing) return res.status(404).json({ message: "Return request not found." });

        if (TERMINAL_STATUSES.includes(existing.status)) {
            return res.status(409).json({
                message: `Return request is already ${existing.status} and can no longer be rejected.`
            });
        }

        const returnRequest = await prisma.returnRequest.update({
            where: { id: returnId },
            data: {
                status: "REJECTED",
                rejectionReason: rejectionReason.trim(),
                reviewedByAdminId: adminId,
                reviewedAt: new Date(),
                ...(typeof adminNotes === "string" ? { adminNotes } : {})
            },
            include: returnInclude
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.RETURN_REJECTED,
            targetType: "ReturnRequest",
            targetId: returnRequest.id,
            description: `Return ${returnRequest.returnNumber} rejected: ${returnRequest.rejectionReason}`,
            previousValue: { status: existing.status },
            newValue: {
                status: returnRequest.status,
                rejectionReason: returnRequest.rejectionReason
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ returnRequest });
    } catch (error: any) {
        console.error("REJECT RETURN ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
