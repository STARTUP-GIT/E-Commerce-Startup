import type { Request, Response } from "express";
import crypto from "crypto";
import { AdminActionType, GuidelineStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";

// Helper to calculate SHA-256 hash of guideline sections
export function computeDocumentHash(version: string, sections: any): string {
    const serialized = JSON.stringify({ version, sections });
    return crypto.createHash("sha256").update(serialized).digest("hex");
}

// ─── GET /api/admin/guidelines ────────────────────────────────────────────────

export const getGuidelines = async (req: Request, res: Response) => {
    try {
        const guidelines = await prisma.communityGuideline.findMany({
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
            include: {
                publishedByAdmin: { select: { id: true, firstName: true, lastName: true } },
                createdByAdmin: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { agreements: true } }
            }
        });

        return res.status(200).json({ guidelines });
    } catch (error: any) {
        console.error("GET GUIDELINES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/guidelines/:id ────────────────────────────────────────────

export const getGuidelineDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);

        const guideline = await prisma.communityGuideline.findUnique({
            where: { id },
            include: {
                publishedByAdmin: { select: { id: true, firstName: true, lastName: true } },
                createdByAdmin: { select: { id: true, firstName: true, lastName: true } },
                _count: { select: { agreements: true } }
            }
        });

        if (!guideline) return res.status(404).json({ message: "Community guideline not found" });

        return res.status(200).json({ guideline });
    } catch (error: any) {
        console.error("GET GUIDELINE DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/guidelines ───────────────────────────────────────────────

export const createGuidelineDraft = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const { version, title, targetAudience = "ALL_SELLERS", sections = [], requiresAcceptance = true } = req.body;

        if (!version || typeof version !== "string" || !version.trim()) {
            return res.status(400).json({ message: "version (e.g. 1.0.0) is required" });
        }
        if (!title || typeof title !== "string" || !title.trim()) {
            return res.status(400).json({ message: "title is required" });
        }
        if (!Array.isArray(sections) || sections.length === 0) {
            return res.status(400).json({ message: "sections array with clauses is required" });
        }

        const existing = await prisma.communityGuideline.findUnique({
            where: { version: version.trim() }
        });
        if (existing) {
            return res.status(409).json({ message: `Version ${version} already exists.` });
        }

        const draft = await prisma.communityGuideline.create({
            data: {
                version: version.trim(),
                title: title.trim(),
                status: GuidelineStatus.DRAFT,
                targetAudience,
                sections,
                requiresAcceptance,
                createdByAdminId: adminId
            }
        });

        return res.status(201).json({ guideline: draft });
    } catch (error: any) {
        console.error("CREATE GUIDELINE DRAFT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── PUT /api/admin/guidelines/:id ────────────────────────────────────────────

export const updateGuidelineDraft = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const { title, sections, targetAudience, requiresAcceptance } = req.body;

        const existing = await prisma.communityGuideline.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "Guideline not found" });

        // IMMUTABILITY: Published versions cannot be overwritten!
        if (existing.status === GuidelineStatus.PUBLISHED || existing.status === GuidelineStatus.SUPERSEDED) {
            return res.status(403).json({
                message: "Published versions are immutable. Please create a new draft version instead."
            });
        }

        const updated = await prisma.communityGuideline.update({
            where: { id },
            data: {
                ...(title ? { title: title.trim() } : {}),
                ...(sections ? { sections } : {}),
                ...(targetAudience ? { targetAudience } : {}),
                ...(typeof requiresAcceptance === "boolean" ? { requiresAcceptance } : {})
            }
        });

        return res.status(200).json({ guideline: updated });
    } catch (error: any) {
        console.error("UPDATE GUIDELINE DRAFT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/guidelines/:id/publish ───────────────────────────────────

export const publishGuideline = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);
        const { effectiveDate } = req.body;

        const guideline = await prisma.communityGuideline.findUnique({ where: { id } });
        if (!guideline) return res.status(404).json({ message: "Guideline not found" });

        if (guideline.status === GuidelineStatus.PUBLISHED) {
            return res.status(400).json({ message: "Guideline is already published" });
        }

        const hash = computeDocumentHash(guideline.version, guideline.sections);

        const published = await prisma.$transaction(async (tx) => {
            // Mark previously published versions as SUPERSEDED
            await tx.communityGuideline.updateMany({
                where: { status: GuidelineStatus.PUBLISHED },
                data: { status: GuidelineStatus.SUPERSEDED }
            });

            // Publish this version
            return tx.communityGuideline.update({
                where: { id },
                data: {
                    status: GuidelineStatus.PUBLISHED,
                    contentHash: hash,
                    publishedAt: new Date(),
                    effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
                    publishedByAdminId: adminId
                }
            });
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.GUIDELINE_PUBLISHED,
            targetType: "CommunityGuideline",
            targetId: id,
            description: `Community Guidelines version ${published.version} ("${published.title}") published with hash ${hash.substring(0, 16)}...`,
            previousValue: { status: guideline.status },
            newValue: {
                status: published.status,
                version: published.version,
                contentHash: hash,
                effectiveDate: published.effectiveDate
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ guideline: published });
    } catch (error: any) {
        console.error("PUBLISH GUIDELINE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/guidelines/:id/agreements or all agreements ───────────────

export const getGuidelineAgreements = async (req: Request, res: Response) => {
    try {
        const id = req.params.id ? String(req.params.id) : undefined;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const search = req.query.search ? String(req.query.search).trim() : undefined;
        const skip = (page - 1) * limit;

        const where: Prisma.SellerGuidelineAgreementWhereInput = {};
        if (id && id !== "all") {
            where.guidelineId = id;
        }
        if (search) {
            where.seller = {
                OR: [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { shop: { name: { contains: search, mode: "insensitive" } } }
                ]
            };
        }

        const [agreements, total] = await prisma.$transaction([
            prisma.sellerGuidelineAgreement.findMany({
                where,
                orderBy: { acceptedAt: "desc" },
                skip,
                take: limit,
                include: {
                    guideline: { select: { id: true, version: true, title: true, contentHash: true } },
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
            prisma.sellerGuidelineAgreement.count({ where })
        ]);

        return res.status(200).json({
            agreements,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET GUIDELINE AGREEMENTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

