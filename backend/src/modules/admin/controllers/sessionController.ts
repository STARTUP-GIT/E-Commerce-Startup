import type { Request, Response } from "express";
import { AdminActionType } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";

const USER_TYPES = ["ADMIN", "CUSTOMER", "SELLER", "DELIVERY_PARTNER"];

const fullName = (firstName?: string | null, lastName?: string | null): string =>
    `${firstName ?? ""} ${lastName ?? ""}`.trim();

export const getSessions = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const userTypeRaw =
            typeof req.query.userType === "string" && req.query.userType.trim()
                ? req.query.userType.trim()
                : undefined;

        if (userTypeRaw && !USER_TYPES.includes(userTypeRaw)) {
            return res.status(400).json({ message: "Invalid userType" });
        }

        const activeRaw =
            typeof req.query.active === "string" && req.query.active.trim()
                ? req.query.active.trim()
                : "true";
        const onlyActive = activeRaw !== "false";

        const where = {
            ...(userTypeRaw ? { userType: userTypeRaw } : {}),
            ...(onlyActive ? { revoked: false, expiresAt: { gt: new Date() } } : {})
        };

        const [rows, total] = await prisma.$transaction([
            prisma.refreshToken.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma.refreshToken.count({ where })
        ]);

        // Batch-resolve a human label per (userType, userId) — never expose tokenHash.
        const idsByType = new Map<string, Set<string>>();
        for (const row of rows) {
            const set = idsByType.get(row.userType) ?? new Set<string>();
            set.add(row.userId);
            idsByType.set(row.userType, set);
        }

        const labels = new Map<string, string>();

        const adminIds = Array.from(idsByType.get("ADMIN") ?? []);
        if (adminIds.length) {
            const admins = await prisma.admin.findMany({
                where: { id: { in: adminIds } },
                select: { id: true, firstName: true, lastName: true, email: true }
            });
            for (const a of admins) {
                labels.set(`ADMIN:${a.id}`, fullName(a.firstName, a.lastName) || a.email);
            }
        }

        const customerIds = Array.from(idsByType.get("CUSTOMER") ?? []);
        if (customerIds.length) {
            const customers = await prisma.customer.findMany({
                where: { id: { in: customerIds } },
                select: { id: true, firstName: true, lastName: true, username: true, email: true }
            });
            for (const c of customers) {
                labels.set(
                    `CUSTOMER:${c.id}`,
                    fullName(c.firstName, c.lastName) || c.username || c.email
                );
            }
        }

        const sellerIds = Array.from(idsByType.get("SELLER") ?? []);
        if (sellerIds.length) {
            const sellers = await prisma.seller.findMany({
                where: { id: { in: sellerIds } },
                select: { id: true, firstName: true, lastName: true, email: true }
            });
            for (const s of sellers) {
                labels.set(`SELLER:${s.id}`, fullName(s.firstName, s.lastName) || s.email);
            }
        }

        const partnerIds = Array.from(idsByType.get("DELIVERY_PARTNER") ?? []);
        if (partnerIds.length) {
            const partners = await prisma.deliveryPartner.findMany({
                where: { id: { in: partnerIds } },
                select: { id: true, firstName: true, lastName: true, email: true }
            });
            for (const p of partners) {
                labels.set(
                    `DELIVERY_PARTNER:${p.id}`,
                    fullName(p.firstName, p.lastName) || p.email
                );
            }
        }

        const now = Date.now();
        const sessions = rows.map((row) => ({
            id: row.id,
            userType: row.userType,
            userId: row.userId,
            userLabel: labels.get(`${row.userType}:${row.userId}`) ?? row.userId,
            createdAt: row.createdAt,
            expiresAt: row.expiresAt,
            revoked: row.revoked,
            active: !row.revoked && row.expiresAt.getTime() > now
        }));

        return res.status(200).json({
            sessions,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET SESSIONS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const revokeSession = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const sessionId = String(req.params.id);

        const session = await prisma.refreshToken.findUnique({ where: { id: sessionId } });
        if (!session) return res.status(404).json({ message: "Session not found." });

        const updated = await prisma.refreshToken.update({
            where: { id: sessionId },
            data: { revoked: true }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SESSION_REVOKED,
            targetType: "Session",
            targetId: session.id,
            description: `Session revoked for ${session.userType} user ${session.userId}`,
            previousValue: { revoked: session.revoked },
            newValue: { revoked: updated.revoked },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ message: "Session revoked" });
    } catch (error: any) {
        console.error("REVOKE SESSION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
