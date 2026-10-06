import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

const parseDate = (value: unknown, field: string): { date?: Date; error?: string } => {
    if (!value) return {};
    const d = new Date(String(value));
    if (isNaN(d.getTime())) return { error: `Invalid \`${field}\` date` };
    return { date: d };
};

/** Shared filters for the AdminAction-backed endpoints. */
const buildLogWhere = (query: Record<string, any>): { where?: any; error?: string } => {
    const { adminId, actionType, targetType, targetId, search, from, to } = query;
    const where: any = {};

    if (adminId) where.adminId = String(adminId);
    if (actionType) where.actionType = String(actionType);
    if (targetType) where.targetType = String(targetType);
    if (targetId) where.targetId = String(targetId);

    if (search && String(search).trim()) {
        where.description = { contains: String(search).trim(), mode: "insensitive" as const };
    }

    const fromDate = parseDate(from, "from");
    if (fromDate.error) return { error: fromDate.error };
    const toDate = parseDate(to, "to");
    if (toDate.error) return { error: toDate.error };

    if (fromDate.date || toDate.date) {
        where.performedAt = {};
        if (fromDate.date) where.performedAt.gte = fromDate.date;
        if (toDate.date) where.performedAt.lte = toDate.date;
    }

    return { where };
};

export const getAdminLogs = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const { where, error } = buildLogWhere(req.query as Record<string, any>);
        if (error) return res.status(400).json({ message: error });
        const whereClause = where ?? {};

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [logs, total] = await prisma.$transaction([
            prisma.adminAction.findMany({
                where: whereClause,
                include: {
                    admin: { select: { id: true, email: true, firstName: true, lastName: true } }
                },
                orderBy: { performedAt: "desc" },
                skip,
                take
            }),
            prisma.adminAction.count({ where: whereClause })
        ]);

        return res.status(200).json({
            logs,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error: any) {
        console.error("GET ADMIN LOGS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getLoginHistory = async (req: Request, res: Response) => {
    try {
        const loginHistory = await prisma.admin.findMany({
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                lastLoginAt: true
            },
            orderBy: { lastLoginAt: "desc" }
        });

        return res.status(200).json({ loginHistory });
    } catch (error: any) {
        console.error("GET LOGIN HISTORY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const { where, error } = buildLogWhere(req.query as Record<string, any>);
        if (error) return res.status(400).json({ message: error });
        const whereClause = where ?? {};

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [logs, total] = await prisma.$transaction([
            prisma.adminAction.findMany({
                where: whereClause,
                include: {
                    admin: { select: { id: true, email: true, firstName: true, lastName: true } }
                },
                orderBy: { performedAt: "desc" },
                skip,
                take
            }),
            prisma.adminAction.count({ where: whereClause })
        ]);

        return res.status(200).json({
            logs,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error: any) {
        console.error("GET AUDIT LOGS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
