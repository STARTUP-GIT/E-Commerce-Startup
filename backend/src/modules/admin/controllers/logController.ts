import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getAdminLogs = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [logs, total] = await prisma.$transaction([
            prisma.adminAction.findMany({
                include: {
                    admin: { select: { id: true, email: true, firstName: true, lastName: true } }
                },
                orderBy: { performedAt: "desc" },
                skip,
                take
            }),
            prisma.adminAction.count()
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
        const { actionType, targetType, targetId, page = 1, limit = 20 } = req.query;

        const whereClause: any = {};
        if (actionType) whereClause.actionType = String(actionType);
        if (targetType) whereClause.targetType = String(targetType);
        if (targetId) whereClause.targetId = String(targetId);

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
