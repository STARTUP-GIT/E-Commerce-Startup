import type { Request, Response } from "express";
import { PolicyNoticeStatus } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";

// ─── GET /seller/api/policy-notices ───────────────────────────────────────────

export const getSellerPolicyNotices = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const search = typeof req.query.search === "string" && req.query.search.trim() ? req.query.search.trim() : undefined;

        const notices = await prisma.marketplacePolicyNotice.findMany({
            where: {
                status: PolicyNoticeStatus.PUBLISHED,
                ...(search
                    ? {
                          OR: [
                              { title: { contains: search, mode: "insensitive" } },
                              { content: { contains: search, mode: "insensitive" } }
                          ]
                      }
                    : {})
            },
            orderBy: { publishedAt: "desc" },
            include: {
                reads: {
                    where: { sellerId },
                    select: { readAt: true }
                }
            }
        });

        const formatted = notices.map((n) => ({
            id: n.id,
            title: n.title,
            category: n.category,
            content: n.content,
            effectiveDate: n.effectiveDate,
            publishedAt: n.publishedAt,
            isRead: n.reads.length > 0,
            readAt: n.reads[0]?.readAt || null
        }));

        const unreadCount = formatted.filter((n) => !n.isRead).length;

        return res.status(200).json({ notices: formatted, unreadCount });
    } catch (error: any) {
        console.error("GET SELLER POLICY NOTICES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /seller/api/policy-notices/:id/read ─────────────────────────────────

export const markNoticeAsRead = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const noticeId = String(req.params.id);

        const notice = await prisma.marketplacePolicyNotice.findUnique({
            where: { id: noticeId }
        });

        if (!notice || notice.status !== PolicyNoticeStatus.PUBLISHED) {
            return res.status(404).json({ message: "Notice not found." });
        }

        const readRecord = await prisma.policyNoticeRead.upsert({
            where: {
                noticeId_sellerId: {
                    noticeId,
                    sellerId
                }
            },
            update: { readAt: new Date() },
            create: {
                noticeId,
                sellerId,
                readAt: new Date()
            }
        });

        return res.status(200).json({ readRecord, message: "Marked as read." });
    } catch (error: any) {
        console.error("MARK NOTICE READ ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
