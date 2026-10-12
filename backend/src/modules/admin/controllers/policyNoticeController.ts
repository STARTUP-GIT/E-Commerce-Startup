import type { Request, Response } from "express";
import { AdminActionType, PolicyNoticeStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";

// ─── GET /api/admin/policy-notices ────────────────────────────────────────────

export const getPolicyNotices = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const status = typeof req.query.status === "string" && req.query.status ? (req.query.status as PolicyNoticeStatus) : undefined;
        const category = typeof req.query.category === "string" && req.query.category ? req.query.category : undefined;
        const search = typeof req.query.search === "string" && req.query.search.trim() ? req.query.search.trim() : undefined;

        const where: Prisma.MarketplacePolicyNoticeWhereInput = {
            ...(status ? { status } : {}),
            ...(category ? { category } : {}),
            ...(search
                ? {
                      OR: [
                          { title: { contains: search, mode: "insensitive" } },
                          { content: { contains: search, mode: "insensitive" } }
                      ]
                  }
                : {})
        };

        const [notices, total] = await prisma.$transaction([
            prisma.marketplacePolicyNotice.findMany({
                where,
                orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
                skip,
                take: limit,
                include: {
                    publishedByAdmin: { select: { id: true, firstName: true, lastName: true } },
                    createdByAdmin: { select: { id: true, firstName: true, lastName: true } },
                    _count: { select: { reads: true } }
                }
            }),
            prisma.marketplacePolicyNotice.count({ where })
        ]);

        return res.status(200).json({
            notices,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET POLICY NOTICES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/policy-notices/:id ────────────────────────────────────────

export const getPolicyNoticeDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);

        const notice = await prisma.marketplacePolicyNotice.findUnique({
            where: { id },
            include: {
                publishedByAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
                createdByAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
                _count: { select: { reads: true } }
            }
        });

        if (!notice) return res.status(404).json({ message: "Notice not found" });

        return res.status(200).json({ notice });
    } catch (error: any) {
        console.error("GET POLICY NOTICE DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/policy-notices ───────────────────────────────────────────

export const createPolicyNotice = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const { title, category, content, effectiveDate, audience = "ALL_SELLERS" } = req.body;

        if (!title || !category || !content || !effectiveDate) {
            return res.status(400).json({ message: "title, category, content, and effectiveDate are required" });
        }

        const notice = await prisma.marketplacePolicyNotice.create({
            data: {
                title: title.trim(),
                category: category.trim(),
                content: content.trim(),
                effectiveDate: new Date(effectiveDate),
                audience,
                status: PolicyNoticeStatus.DRAFT,
                createdByAdminId: adminId
            }
        });

        return res.status(201).json({ notice });
    } catch (error: any) {
        console.error("CREATE POLICY NOTICE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── PUT /api/admin/policy-notices/:id ─────────────────────────────────────────

export const updatePolicyNotice = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { title, category, content, effectiveDate, audience } = req.body;

        const existing = await prisma.marketplacePolicyNotice.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "Notice not found" });

        const updated = await prisma.marketplacePolicyNotice.update({
            where: { id },
            data: {
                ...(title ? { title: title.trim() } : {}),
                ...(category ? { category: category.trim() } : {}),
                ...(content ? { content: content.trim() } : {}),
                ...(effectiveDate ? { effectiveDate: new Date(effectiveDate) } : {}),
                ...(audience ? { audience } : {})
            }
        });

        return res.status(200).json({ notice: updated });
    } catch (error: any) {
        console.error("UPDATE POLICY NOTICE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/policy-notices/:id/publish ───────────────────────────────

export const publishPolicyNotice = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);

        const existing = await prisma.marketplacePolicyNotice.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "Notice not found" });

        const published = await prisma.marketplacePolicyNotice.update({
            where: { id },
            data: {
                status: PolicyNoticeStatus.PUBLISHED,
                publishedAt: new Date(),
                publishedByAdminId: adminId
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.POLICY_NOTICE_PUBLISHED,
            targetType: "MarketplacePolicyNotice",
            targetId: id,
            description: `Published policy announcement: "${published.title}" (Effective: ${published.effectiveDate.toISOString().split("T")[0]})`,
            previousValue: { status: existing.status },
            newValue: { status: published.status, publishedAt: published.publishedAt },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ notice: published });
    } catch (error: any) {
        console.error("PUBLISH POLICY NOTICE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/policy-notices/:id/reads ──────────────────────────────────

export const getPolicyNoticeReads = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [reads, total] = await prisma.$transaction([
            prisma.policyNoticeRead.findMany({
                where: { noticeId: id },
                orderBy: { readAt: "desc" },
                skip,
                take: limit,
                include: {
                    seller: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            shop: { select: { id: true, name: true } }
                        }
                    }
                }
            }),
            prisma.policyNoticeRead.count({ where: { noticeId: id } })
        ]);

        return res.status(200).json({
            reads,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET NOTICE READS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
