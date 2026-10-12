import type { Request, Response } from "express";
import {
    AdminActionType,
    AppealStatus,
    EnforcementStatus,
    NotificationChannel,
    NotificationType,
    Prisma,
    SuspensionType
} from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { calculateQualifyingStrikes } from "./enforcementController.js";

// ─── GET /api/admin/appeals ───────────────────────────────────────────────────

export const getAppeals = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const status = typeof req.query.status === "string" && req.query.status ? (req.query.status as AppealStatus) : undefined;
        const search = typeof req.query.search === "string" && req.query.search.trim() ? req.query.search.trim() : undefined;
        const assignedAdminId = typeof req.query.assignedAdminId === "string" && req.query.assignedAdminId ? req.query.assignedAdminId : undefined;

        const where: Prisma.SellerAppealWhereInput = {
            ...(status ? { status } : {}),
            ...(assignedAdminId ? { assignedAdminId } : {}),
            ...(search
                ? {
                      OR: [
                          { reference: { contains: search, mode: "insensitive" } },
                          { sellerExplanation: { contains: search, mode: "insensitive" } },
                          { seller: { firstName: { contains: search, mode: "insensitive" } } },
                          { seller: { lastName: { contains: search, mode: "insensitive" } } },
                          { seller: { email: { contains: search, mode: "insensitive" } } },
                          { seller: { shop: { name: { contains: search, mode: "insensitive" } } } }
                      ]
                  }
                : {})
        };

        const [appeals, total, pendingCount, underReviewCount, moreInfoCount, decidedCount] =
            await prisma.$transaction([
                prisma.sellerAppeal.findMany({
                    where,
                    orderBy: { submittedAt: "desc" },
                    skip,
                    take: limit,
                    include: {
                        seller: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                username: true,
                                strikeCount: true,
                                status: true,
                                isBanned: true,
                                shop: { select: { id: true, name: true } }
                            }
                        },
                        enforcement: {
                            select: {
                                id: true,
                                reference: true,
                                type: true,
                                severity: true,
                                reason: true,
                                guidelineClause: true,
                                guidelineVersion: true,
                                issuedAt: true,
                                adminId: true
                            }
                        },
                        assignedAdmin: { select: { id: true, firstName: true, lastName: true } },
                        decidedByAdmin: { select: { id: true, firstName: true, lastName: true } }
                    }
                }),
                prisma.sellerAppeal.count({ where }),
                prisma.sellerAppeal.count({ where: { status: AppealStatus.PENDING } }),
                prisma.sellerAppeal.count({ where: { status: AppealStatus.UNDER_REVIEW } }),
                prisma.sellerAppeal.count({ where: { status: AppealStatus.MORE_INFO_REQUESTED } }),
                prisma.sellerAppeal.count({
                    where: { status: { in: [AppealStatus.UPHELD, AppealStatus.OVERTURNED, AppealStatus.PARTIALLY_UPHELD, AppealStatus.CLOSED] } }
                })
            ]);

        return res.status(200).json({
            appeals,
            summary: {
                total,
                pendingCount,
                underReviewCount,
                moreInfoCount,
                decidedCount
            },
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error("GET ADMIN APPEALS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/appeals/:id ───────────────────────────────────────────────

export const getAppealDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);

        const appeal = await prisma.sellerAppeal.findUnique({
            where: { id },
            include: {
                seller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        username: true,
                        strikeCount: true,
                        status: true,
                        isBanned: true,
                        createdAt: true,
                        shop: { select: { id: true, name: true, status: true } }
                    }
                },
                enforcement: {
                    include: {
                        admin: { select: { id: true, firstName: true, lastName: true, email: true } }
                    }
                },
                assignedAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
                decidedByAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
                events: { orderBy: { createdAt: "asc" } }
            }
        });

        if (!appeal) {
            return res.status(404).json({ message: "Appeal not found" });
        }

        return res.status(200).json({ appeal });
    } catch (error: any) {
        console.error("GET APPEAL DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/appeals/:id/assign ───────────────────────────────────────

export const assignAppealReviewer = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);
        const { assignedAdminId } = req.body;

        const appeal = await prisma.sellerAppeal.findUnique({
            where: { id },
            include: { enforcement: true }
        });
        if (!appeal) return res.status(404).json({ message: "Appeal not found" });

        const targetAdminId = assignedAdminId || adminId;

        const updated = await prisma.$transaction(async (tx) => {
            const resAppeal = await tx.sellerAppeal.update({
                where: { id },
                data: {
                    assignedAdminId: targetAdminId,
                    status: appeal.status === AppealStatus.PENDING ? AppealStatus.UNDER_REVIEW : appeal.status
                }
            });

            await tx.appealEvent.create({
                data: {
                    appealId: id,
                    actorType: "ADMIN",
                    actorId: adminId,
                    eventType: "REVIEWER_ASSIGNED",
                    note: `Reviewer assigned: ${targetAdminId}`
                }
            });

            return resAppeal;
        });

        return res.status(200).json({ appeal: updated });
    } catch (error: any) {
        console.error("ASSIGN REVIEWER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/appeals/:id/request-info ─────────────────────────────────

export const requestMoreInfo = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);
        const { question } = req.body;

        if (!question || typeof question !== "string" || !question.trim()) {
            return res.status(400).json({ message: "Question/request for additional information is required." });
        }

        const appeal = await prisma.sellerAppeal.findUnique({
            where: { id },
            include: { seller: true }
        });
        if (!appeal) return res.status(404).json({ message: "Appeal not found" });

        const updated = await prisma.$transaction(async (tx) => {
            const resAppeal = await tx.sellerAppeal.update({
                where: { id },
                data: { status: AppealStatus.MORE_INFO_REQUESTED }
            });

            await tx.appealEvent.create({
                data: {
                    appealId: id,
                    actorType: "ADMIN",
                    actorId: adminId,
                    eventType: "MORE_INFO_REQUESTED",
                    note: question.trim()
                }
            });

            await tx.notification.create({
                data: {
                    sellerId: appeal.sellerId,
                    type: NotificationType.APPEAL_UPDATE,
                    channel: NotificationChannel.IN_APP,
                    title: `Information Requested on Appeal ${appeal.reference}`,
                    body: `Marketplace reviewers requested more information regarding your appeal: "${question.trim()}". Please respond from your Appeals page.`
                }
            });

            return resAppeal;
        });

        return res.status(200).json({ appeal: updated });
    } catch (error: any) {
        console.error("REQUEST MORE INFO ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/appeals/:id/notes ────────────────────────────────────────

export const addInternalNote = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);
        const { note } = req.body;

        if (!note || typeof note !== "string" || !note.trim()) {
            return res.status(400).json({ message: "Internal note cannot be empty." });
        }

        const appeal = await prisma.sellerAppeal.findUnique({ where: { id } });
        if (!appeal) return res.status(404).json({ message: "Appeal not found" });

        const updatedNotes = appeal.internalNotes
            ? `${appeal.internalNotes}\n\n[${new Date().toISOString()} - Admin ${adminId}]: ${note.trim()}`
            : `[${new Date().toISOString()} - Admin ${adminId}]: ${note.trim()}`;

        const updated = await prisma.sellerAppeal.update({
            where: { id },
            data: { internalNotes: updatedNotes }
        });

        return res.status(200).json({ appeal: updated });
    } catch (error: any) {
        console.error("ADD INTERNAL NOTE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/appeals/:id/decision ─────────────────────────────────────

export const recordAppealDecision = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);
        const { decision, decisionReason } = req.body;

        const allowedDecisions = ["UPHELD", "OVERTURNED", "PARTIALLY_UPHELD", "CLOSED"];
        if (!allowedDecisions.includes(decision)) {
            return res.status(400).json({
                message: `decision must be one of: ${allowedDecisions.join(", ")}`
            });
        }

        if (!decisionReason || typeof decisionReason !== "string" || !decisionReason.trim()) {
            return res.status(400).json({ message: "A mandatory evidence-based decision reason is required." });
        }

        const appeal = await prisma.sellerAppeal.findUnique({
            where: { id },
            include: { enforcement: true, seller: true }
        });
        if (!appeal) return res.status(404).json({ message: "Appeal not found" });

        // Impartiality guidance check: where practical, separate original enforcement issuer from appeal reviewer
        const isOriginalIssuer = appeal.enforcement.adminId === adminId;

        const result = await prisma.$transaction(async (tx) => {
            const updatedAppeal = await tx.sellerAppeal.update({
                where: { id },
                data: {
                    status: decision as AppealStatus,
                    decisionReason: decisionReason.trim(),
                    decidedByAdminId: adminId,
                    decidedAt: new Date()
                }
            });

            let newQualifyingStrikes = appeal.seller.strikeCount;
            let reinstated = false;

            if (decision === "OVERTURNED") {
                // Enforcement overturned -> not active, status OVERTURNED
                await tx.sellerStrike.update({
                    where: { id: appeal.enforcementId },
                    data: {
                        status: EnforcementStatus.OVERTURNED,
                        isActive: false
                    }
                });

                newQualifyingStrikes = await calculateQualifyingStrikes(tx, appeal.sellerId);

                // Check if seller was suspended due to three-strikes and qualifies for reinstatement
                if (newQualifyingStrikes < 3) {
                    const activeSuspension = await tx.sellerSuspension.findFirst({
                        where: {
                            sellerId: appeal.sellerId,
                            type: SuspensionType.THREE_STRIKES,
                            reinstatedAt: null
                        }
                    });

                    if (activeSuspension) {
                        reinstated = true;
                        await tx.seller.update({
                            where: { id: appeal.sellerId },
                            data: {
                                isBanned: false,
                                status: "ACTIVE",
                                banReason: null
                            }
                        });

                        await tx.sellerSuspension.update({
                            where: { id: activeSuspension.id },
                            data: {
                                reinstatedAt: new Date(),
                                reinstatementReason: `Strike overturned via Appeal ${appeal.reference}: ${decisionReason.trim()}`,
                                reinstatedByAdminId: adminId
                            }
                        });

                        await tx.notification.create({
                            data: {
                                sellerId: appeal.sellerId,
                                type: NotificationType.SELLER_REINSTATED,
                                channel: NotificationChannel.IN_APP,
                                title: "Selling Privileges Reinstated",
                                body: `Your selling privileges have been restored after appeal ${appeal.reference} overturned the qualifying strike.`
                            }
                        });
                    }
                }
            } else if (decision === "UPHELD") {
                await tx.sellerStrike.update({
                    where: { id: appeal.enforcementId },
                    data: {
                        status: EnforcementStatus.UPHELD,
                        isActive: true
                    }
                });

                if (appeal.enforcement.type === "STRIKE") {
                    newQualifyingStrikes = await calculateQualifyingStrikes(tx, appeal.sellerId);
                }
            } else {
                await tx.sellerStrike.update({
                    where: { id: appeal.enforcementId },
                    data: { status: EnforcementStatus.CLOSED }
                });
            }

            // Timeline event
            await tx.appealEvent.create({
                data: {
                    appealId: id,
                    actorType: "ADMIN",
                    actorId: adminId,
                    eventType: `APPEAL_${decision}`,
                    note: `Decision: ${decision}. Reason: ${decisionReason.trim()}`
                }
            });

            // Notification to seller
            await tx.notification.create({
                data: {
                    sellerId: appeal.sellerId,
                    type: NotificationType.APPEAL_UPDATE,
                    channel: NotificationChannel.IN_APP,
                    title: `Appeal Decision: ${decision}`,
                    body: `Decision on appeal ${appeal.reference}: ${decision}. Reason: "${decisionReason.trim()}".`
                }
            });

            return {
                updatedAppeal,
                newQualifyingStrikes,
                reinstated
            };
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.APPEAL_REVIEWED,
            targetType: "SellerAppeal",
            targetId: id,
            description: `Appeal ${appeal.reference} decided as ${decision}. Reason: ${decisionReason.trim()}${isOriginalIssuer ? " (Note: Reviewed by original issuer)" : ""}`,
            previousValue: { status: appeal.status },
            newValue: {
                status: decision,
                decisionReason: decisionReason.trim(),
                newQualifyingStrikes: result.newQualifyingStrikes,
                reinstated: result.reinstated
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            appeal: result.updatedAppeal,
            qualifyingStrikes: result.newQualifyingStrikes,
            reinstated: result.reinstated
        });
    } catch (error: any) {
        console.error("RECORD APPEAL DECISION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
