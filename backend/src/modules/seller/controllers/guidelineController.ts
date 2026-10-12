import type { Request, Response } from "express";
import { GuidelineStatus } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";

// ─── GET /seller/api/guidelines/active ────────────────────────────────────────

export const getActiveGuideline = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;

        const guideline = await prisma.communityGuideline.findFirst({
            where: { status: GuidelineStatus.PUBLISHED },
            orderBy: { publishedAt: "desc" }
        });

        if (!guideline) {
            return res.status(200).json({
                guideline: null,
                isAccepted: true,
                message: "No published community guidelines pending."
            });
        }

        const agreement = await prisma.sellerGuidelineAgreement.findUnique({
            where: {
                sellerId_guidelineId: {
                    sellerId,
                    guidelineId: guideline.id
                }
            }
        });

        return res.status(200).json({
            guideline,
            isAccepted: !guideline.requiresAcceptance || !!agreement,
            acceptedAt: agreement?.acceptedAt || null,
            legalName: agreement?.legalName || null
        });
    } catch (error: any) {
        console.error("GET ACTIVE GUIDELINE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /seller/api/guidelines/accept ───────────────────────────────────────

export const acceptGuideline = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;
        const { guidelineId, legalName, signatureImageUrl } = req.body;

        if (!guidelineId || typeof guidelineId !== "string") {
            return res.status(400).json({ message: "guidelineId is required" });
        }
        if (!legalName || typeof legalName !== "string" || !legalName.trim()) {
            return res.status(400).json({ message: "Please type your full legal name to confirm acceptance." });
        }

        const guideline = await prisma.communityGuideline.findUnique({
            where: { id: guidelineId }
        });

        if (!guideline || guideline.status !== GuidelineStatus.PUBLISHED) {
            return res.status(404).json({ message: "Published guideline not found." });
        }

        // Idempotency: check if already accepted
        const existing = await prisma.sellerGuidelineAgreement.findUnique({
            where: {
                sellerId_guidelineId: {
                    sellerId,
                    guidelineId
                }
            }
        });

        if (existing) {
            return res.status(200).json({
                agreement: existing,
                message: "Guideline was already accepted previously."
            });
        }

        const agreement = await prisma.sellerGuidelineAgreement.create({
            data: {
                sellerId,
                guidelineId,
                guidelineVersion: guideline.version,
                documentHash: guideline.contentHash || "HASH_PENDING",
                legalName: legalName.trim(),
                ipAddress: req.ip || null,
                userAgent: (req.headers["user-agent"] as string) || null,
                signatureImageUrl: signatureImageUrl || null
            }
        });

        return res.status(201).json({
            agreement,
            message: `Community Guidelines version ${guideline.version} accepted successfully.`
        });
    } catch (error: any) {
        console.error("ACCEPT GUIDELINE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /seller/api/guidelines/agreements ────────────────────────────────────

export const getMyAgreements = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;

        const agreements = await prisma.sellerGuidelineAgreement.findMany({
            where: { sellerId },
            orderBy: { acceptedAt: "desc" },
            include: {
                guideline: {
                    select: {
                        id: true,
                        version: true,
                        title: true,
                        effectiveDate: true,
                        contentHash: true
                    }
                }
            }
        });

        return res.status(200).json({ agreements });
    } catch (error: any) {
        console.error("GET MY AGREEMENTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
