import type { Request, Response } from "express";
import { AdminActionType, PostmortemStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";

// ─── GET /api/admin/postmortems ───────────────────────────────────────────────

export const getPostmortems = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const severity = typeof req.query.severity === "string" && req.query.severity ? req.query.severity : undefined;
        const reviewStatus = typeof req.query.reviewStatus === "string" && req.query.reviewStatus ? (req.query.reviewStatus as PostmortemStatus) : undefined;
        const search = typeof req.query.search === "string" && req.query.search.trim() ? req.query.search.trim() : undefined;

        const where: Prisma.PostmortemReportWhereInput = {
            ...(severity ? { severity } : {}),
            ...(reviewStatus ? { reviewStatus } : {}),
            ...(search
                ? {
                      OR: [
                          { title: { contains: search, mode: "insensitive" } },
                          { summary: { contains: search, mode: "insensitive" } },
                          { reference: { contains: search, mode: "insensitive" } },
                          { responsibleOwner: { contains: search, mode: "insensitive" } }
                      ]
                  }
                : {})
        };

        const [postmortems, total] = await prisma.$transaction([
            prisma.postmortemReport.findMany({
                where,
                orderBy: { startTime: "desc" },
                skip,
                take: limit,
                include: {
                    createdByAdmin: { select: { id: true, firstName: true, lastName: true } },
                    approvedByAdmin: { select: { id: true, firstName: true, lastName: true } }
                }
            }),
            prisma.postmortemReport.count({ where })
        ]);

        return res.status(200).json({
            postmortems,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET POSTMORTEMS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/postmortems/:id ───────────────────────────────────────────

export const getPostmortemDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);

        const postmortem = await prisma.postmortemReport.findUnique({
            where: { id },
            include: {
                createdByAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
                approvedByAdmin: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
        });

        if (!postmortem) return res.status(404).json({ message: "Postmortem report not found" });

        return res.status(200).json({ postmortem });
    } catch (error: any) {
        console.error("GET POSTMORTEM DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/postmortems ──────────────────────────────────────────────

export const createPostmortem = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const {
            title,
            summary,
            severity = "SEV2",
            relatedType,
            relatedId,
            startTime,
            detectionTime,
            resolutionTime,
            impact,
            timeline = [],
            rootCause,
            contributingFactors,
            resolution,
            correctiveActions = [],
            preventiveActions,
            responsibleOwner
        } = req.body;

        if (!title || !summary || !rootCause || !resolution || !responsibleOwner) {
            return res.status(400).json({
                message: "title, summary, rootCause, resolution, and responsibleOwner are required"
            });
        }

        const reference = `PM-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

        const postmortem = await prisma.postmortemReport.create({
            data: {
                reference,
                title: title.trim(),
                summary: summary.trim(),
                severity,
                relatedType: relatedType || null,
                relatedId: relatedId || null,
                startTime: startTime ? new Date(startTime) : new Date(),
                detectionTime: detectionTime ? new Date(detectionTime) : new Date(),
                resolutionTime: resolutionTime ? new Date(resolutionTime) : null,
                impact: impact ? impact.trim() : "Incident impact recorded",
                timeline,
                rootCause: rootCause.trim(),
                contributingFactors: contributingFactors ? contributingFactors.trim() : "",
                resolution: resolution.trim(),
                correctiveActions,
                preventiveActions: preventiveActions ? preventiveActions.trim() : "",
                responsibleOwner: responsibleOwner.trim(),
                reviewStatus: PostmortemStatus.DRAFT,
                createdByAdminId: adminId
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.POSTMORTEM_CREATED,
            targetType: "PostmortemReport",
            targetId: postmortem.id,
            description: `Drafted postmortem report ${reference}: "${postmortem.title}" (Severity: ${severity})`,
            previousValue: null,
            newValue: { reference, title: postmortem.title, severity },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(201).json({ postmortem });
    } catch (error: any) {
        console.error("CREATE POSTMORTEM ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── PUT /api/admin/postmortems/:id ───────────────────────────────────────────

export const updatePostmortem = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);
        const {
            title,
            summary,
            severity,
            impact,
            timeline,
            rootCause,
            contributingFactors,
            resolution,
            correctiveActions,
            preventiveActions,
            responsibleOwner,
            reviewStatus
        } = req.body;

        const existing = await prisma.postmortemReport.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: "Postmortem report not found" });

        const updated = await prisma.postmortemReport.update({
            where: { id },
            data: {
                ...(title ? { title: title.trim() } : {}),
                ...(summary ? { summary: summary.trim() } : {}),
                ...(severity ? { severity } : {}),
                ...(impact ? { impact: impact.trim() } : {}),
                ...(timeline ? { timeline } : {}),
                ...(rootCause ? { rootCause: rootCause.trim() } : {}),
                ...(contributingFactors ? { contributingFactors: contributingFactors.trim() } : {}),
                ...(resolution ? { resolution: resolution.trim() } : {}),
                ...(correctiveActions ? { correctiveActions } : {}),
                ...(preventiveActions ? { preventiveActions: preventiveActions.trim() } : {}),
                ...(responsibleOwner ? { responsibleOwner: responsibleOwner.trim() } : {}),
                ...(reviewStatus ? { reviewStatus: reviewStatus as PostmortemStatus } : {}),
                ...(reviewStatus === "APPROVED" || reviewStatus === "CLOSED" ? { approvedByAdminId: adminId } : {})
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.POSTMORTEM_UPDATED,
            targetType: "PostmortemReport",
            targetId: id,
            description: `Updated postmortem report ${existing.reference} (Status: ${updated.reviewStatus})`,
            previousValue: { reviewStatus: existing.reviewStatus },
            newValue: { reviewStatus: updated.reviewStatus },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ postmortem: updated });
    } catch (error: any) {
        console.error("UPDATE POSTMORTEM ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
