import type { Request, Response } from "express";
import {
    AppealStatus,
    EnforcementStatus,
    NotificationChannel,
    NotificationType,
    Prisma
} from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { calculateQualifyingStrikes } from "../../admin/controllers/enforcementController.js";

// ─── GET /seller/api/appeals ──────────────────────────────────────────────────

export const getMyAppeals = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;

        const appeals = await prisma.sellerAppeal.findMany({
            where: { sellerId },
            orderBy: { submittedAt: "desc" },
            include: {
                enforcement: {
                    select: {
                        id: true,
                        reference: true,
                        type: true,
                        severity: true,
                        reason: true,
                        guidelineClause: true,
                        guidelineVersion: true,
                        issuedAt: true
                    }
                },
                events: {
                    orderBy: { createdAt: "asc" },
                    select: {
                        id: true,
                        actorType: true,
                        eventType: true,
                        note: true,
                        createdAt: true
                    }
                }
            }
        });

        return res.status(200).json({ appeals });
    } catch (error: any) {
        console.error("GET MY APPEALS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /seller/api/appeals/:id ──────────────────────────────────────────────

export const getAppealDetail = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const id = String(req.params.id);

        const appeal = await prisma.sellerAppeal.findFirst({
            where: { id, sellerId },
            include: {
                enforcement: true,
                events: {
                    orderBy: { createdAt: "asc" },
                    select: {
                        id: true,
                        actorType: true,
                        eventType: true,
                        note: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!appeal) {
            return res.status(404).json({ message: "Appeal not found" });
        }

        // Never leak internal notes to seller
        const { internalNotes, ...safeAppeal } = appeal as any;

        return res.status(200).json({ appeal: safeAppeal });
    } catch (error: any) {
        console.error("GET APPEAL DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /seller/api/appeals ─────────────────────────────────────────────────

export const createAppeal = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const { enforcementId, explanation, attachments = [], orderId, reportId } = req.body;

        if (!enforcementId || typeof enforcementId !== "string") {
            return res.status(400).json({ message: "enforcementId is required" });
        }
        if (!explanation || typeof explanation !== "string" || !explanation.trim()) {
            return res.status(400).json({ message: "A written explanation is required to file an appeal." });
        }

        const enforcement = await prisma.sellerStrike.findUnique({
            where: { id: enforcementId }
        });

        if (!enforcement || enforcement.sellerId !== sellerId) {
            return res.status(404).json({ message: "Enforcement decision not found." });
        }

        // Prevent duplicate active appeals
        const existingActiveAppeal = await prisma.sellerAppeal.findFirst({
            where: {
                enforcementId,
                status: {
                    in: [
                        AppealStatus.PENDING,
                        AppealStatus.UNDER_REVIEW,
                        AppealStatus.MORE_INFO_REQUESTED
                    ]
                }
            }
        });

        if (existingActiveAppeal) {
            return res.status(409).json({
                message: `An active appeal (${existingActiveAppeal.reference}) is already under review for this decision.`
            });
        }

        const appealReference = `APP-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const appeal = await prisma.$transaction(async (tx) => {
            const newAppeal = await tx.sellerAppeal.create({
                data: {
                    reference: appealReference,
                    sellerId,
                    enforcementId,
                    status: AppealStatus.PENDING,
                    sellerExplanation: explanation.trim(),
                    sellerAttachments: Array.isArray(attachments) ? attachments : [],
                    orderId: orderId || null,
                    reportId: reportId || null
                }
            });

            // Update strike status to UNDER_APPEAL
            await tx.sellerStrike.update({
                where: { id: enforcementId },
                data: { status: EnforcementStatus.UNDER_APPEAL }
            });

            // Pending strikes do NOT count toward valid qualifying threshold
            if (enforcement.type === "STRIKE") {
                await calculateQualifyingStrikes(tx, sellerId);
            }

            // Timeline event
            await tx.appealEvent.create({
                data: {
                    appealId: newAppeal.id,
                    actorType: "SELLER",
                    actorId: sellerId,
                    eventType: "APPEAL_SUBMITTED",
                    note: "Appeal submitted with statement and evidence."
                }
            });

            return newAppeal;
        });

        return res.status(201).json({ appeal });
    } catch (error: any) {
        console.error("CREATE APPEAL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /seller/api/appeals/:id/additional-info ─────────────────────────────

export const submitAdditionalInfo = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const id = String(req.params.id);
        const { note, attachments = [] } = req.body;

        if (!note || typeof note !== "string" || !note.trim()) {
            return res.status(400).json({ message: "Additional information note is required" });
        }

        const appeal = await prisma.sellerAppeal.findFirst({
            where: { id, sellerId }
        });

        if (!appeal) {
            return res.status(404).json({ message: "Appeal not found" });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const currentAttachments = appeal.sellerAttachments || [];
            const newAttachments = Array.isArray(attachments) ? attachments : [];

            const resAppeal = await tx.sellerAppeal.update({
                where: { id },
                data: {
                    status: AppealStatus.UNDER_REVIEW,
                    sellerAttachments: [...currentAttachments, ...newAttachments]
                }
            });

            await tx.appealEvent.create({
                data: {
                    appealId: id,
                    actorType: "SELLER",
                    actorId: sellerId,
                    eventType: "MORE_INFO_PROVIDED",
                    note: note.trim()
                }
            });

            return resAppeal;
        });

        return res.status(200).json({ appeal: updated });
    } catch (error: any) {
        console.error("SUBMIT ADDITIONAL INFO ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
