import type { Request, Response } from "express";
import { EnforcementStatus, EnforcementType } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";

export const getSellerEnforcements = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId!;

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            select: {
                id: true,
                strikeCount: true,
                status: true,
                isBanned: true,
                bannedAt: true,
                banReason: true
            }
        });

        if (!seller) {
            return res.status(404).json({ message: "Seller not found" });
        }

        const [records, suspensions] = await prisma.$transaction([
            prisma.sellerStrike.findMany({
                where: { sellerId },
                orderBy: { issuedAt: "desc" },
                select: {
                    id: true,
                    reference: true,
                    type: true,
                    status: true,
                    severity: true,
                    reason: true,
                    description: true,
                    guidelineVersion: true,
                    guidelineClause: true,
                    evidenceUrls: true,
                    issuedAt: true,
                    appeal: {
                        select: {
                            id: true,
                            reference: true,
                            status: true,
                            submittedAt: true,
                            decisionReason: true,
                            decidedAt: true
                        }
                    }
                }
            }),
            prisma.sellerSuspension.findMany({
                where: { sellerId },
                orderBy: { suspendedAt: "desc" },
                select: {
                    id: true,
                    type: true,
                    reason: true,
                    suspendedAt: true,
                    reinstatedAt: true,
                    reinstatementReason: true
                }
            })
        ]);

        const qualifyingStrikes = records.filter(
            (r) =>
                r.type === EnforcementType.STRIKE &&
                (r.status === EnforcementStatus.ISSUED || r.status === EnforcementStatus.UPHELD)
        );

        const warnings = records.filter((r) => r.type === EnforcementType.WARNING);

        return res.status(200).json({
            summary: {
                qualifyingStrikeCount: qualifyingStrikes.length,
                maxStrikes: 3,
                totalWarnings: warnings.length,
                isSuspended: seller.isBanned || seller.status === "DISABLED",
                banReason: seller.banReason
            },
            enforcements: records,
            suspensions
        });
    } catch (error: any) {
        console.error("GET SELLER ENFORCEMENTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
