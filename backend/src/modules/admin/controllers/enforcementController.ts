import type { Request, Response } from "express";
import {
    AdminActionType,
    EnforcementStatus,
    EnforcementType,
    NotificationChannel,
    NotificationType,
    Prisma,
    StrikeSeverity,
    SuspensionType
} from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";

const sellerSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    username: true,
    strikeCount: true,
    status: true,
    isBanned: true,
    shop: { select: { id: true, name: true, status: true } }
};

/**
 * Authoritative recalculation of a seller's valid qualifying strikes.
 * Qualifying strikes rule:
 * - type === STRIKE
 * - isActive === true
 * - status IN [ISSUED, UPHELD]
 * (Warnings, Under Appeal, Overturned, Withdrawn, and Closed do NOT qualify).
 */
export async function calculateQualifyingStrikes(
    tx: Prisma.TransactionClient,
    sellerId: string
): Promise<number> {
    const validCount = await tx.sellerStrike.count({
        where: {
            sellerId,
            type: EnforcementType.STRIKE,
            isActive: true,
            status: { in: [EnforcementStatus.ISSUED, EnforcementStatus.UPHELD] }
        }
    });

    await tx.seller.update({
        where: { id: sellerId },
        data: { strikeCount: validCount }
    });

    return validCount;
}

// ─── GET /api/admin/seller-enforcement ─────────────────────────────────────────

export const getEnforcements = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const type = typeof req.query.type === "string" && req.query.type ? (req.query.type as EnforcementType) : undefined;
        const status = typeof req.query.status === "string" && req.query.status ? (req.query.status as EnforcementStatus) : undefined;
        const sellerId = typeof req.query.sellerId === "string" && req.query.sellerId ? req.query.sellerId : undefined;
        const search = typeof req.query.search === "string" && req.query.search.trim() ? req.query.search.trim() : undefined;

        const where: Prisma.SellerStrikeWhereInput = {
            ...(type ? { type } : {}),
            ...(status ? { status } : {}),
            ...(sellerId ? { sellerId } : {}),
            ...(search
                ? {
                      OR: [
                          { reason: { contains: search, mode: "insensitive" } },
                          { reference: { contains: search, mode: "insensitive" } },
                          { guidelineClause: { contains: search, mode: "insensitive" } },
                          { seller: { firstName: { contains: search, mode: "insensitive" } } },
                          { seller: { lastName: { contains: search, mode: "insensitive" } } },
                          { seller: { email: { contains: search, mode: "insensitive" } } },
                          { seller: { shop: { name: { contains: search, mode: "insensitive" } } } }
                      ]
                  }
                : {})
        };

        const [items, total, totalWarnings, totalQualifyingStrikes, totalPendingAppeals, totalSuspendedSellers] =
            await prisma.$transaction([
                prisma.sellerStrike.findMany({
                    where,
                    orderBy: { issuedAt: "desc" },
                    skip,
                    take: limit,
                    include: {
                        seller: { select: sellerSelect },
                        admin: { select: { id: true, firstName: true, lastName: true, email: true } },
                        appeal: {
                            select: {
                                id: true,
                                reference: true,
                                status: true,
                                submittedAt: true,
                                decisionReason: true
                            }
                        }
                    }
                }),
                prisma.sellerStrike.count({ where }),
                prisma.sellerStrike.count({ where: { type: EnforcementType.WARNING } }),
                prisma.sellerStrike.count({
                    where: {
                        type: EnforcementType.STRIKE,
                        isActive: true,
                        status: { in: [EnforcementStatus.ISSUED, EnforcementStatus.UPHELD] }
                    }
                }),
                prisma.sellerAppeal.count({
                    where: { status: { in: ["PENDING", "UNDER_REVIEW", "MORE_INFO_REQUESTED"] } }
                }),
                prisma.seller.count({
                    where: {
                        OR: [{ isBanned: true }, { status: "DISABLED" }]
                    }
                })
            ]);

        return res.status(200).json({
            items,
            summary: {
                totalWarnings,
                totalQualifyingStrikes,
                totalPendingAppeals,
                totalSuspendedSellers
            },
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error("GET ENFORCEMENTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/seller-enforcement ────────────────────────────────────────

export const issueEnforcement = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const {
            sellerId,
            type,
            reason,
            description,
            severity,
            guidelineVersion,
            guidelineClause,
            evidenceUrls = [],
            relatedReportId
        } = req.body;

        if (!sellerId || typeof sellerId !== "string") {
            return res.status(400).json({ message: "sellerId is required" });
        }
        if (!type || !["WARNING", "STRIKE"].includes(type)) {
            return res.status(400).json({ message: "type must be WARNING or STRIKE" });
        }
        if (!reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ message: "reason is required" });
        }

        // Validate Strike specific requirements
        if (type === "STRIKE") {
            if (!guidelineVersion || !guidelineClause) {
                return res.status(400).json({
                    message: "Community guideline version and specific clause are mandatory when issuing a Strike."
                });
            }
        }

        const enforcementReference = `ENF-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const result = await prisma.$transaction(async (tx) => {
            const seller = await tx.seller.findUnique({
                where: { id: sellerId },
                include: { shop: true }
            });
            if (!seller) {
                throw new Error("Seller not found");
            }

            const strikeRecord = await tx.sellerStrike.create({
                data: {
                    reference: enforcementReference,
                    sellerId: seller.id,
                    adminId,
                    type: type as EnforcementType,
                    status: EnforcementStatus.ISSUED,
                    severity: (severity as StrikeSeverity) || (type === "WARNING" ? StrikeSeverity.WARNING : StrikeSeverity.MAJOR),
                    reason: reason.trim(),
                    description: typeof description === "string" ? description.trim() : null,
                    guidelineVersion: guidelineVersion || null,
                    guidelineClause: guidelineClause || null,
                    evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
                    relatedReportId: relatedReportId || null,
                    isActive: true
                },
                include: {
                    seller: { select: sellerSelect },
                    admin: { select: { id: true, firstName: true, lastName: true, email: true } }
                }
            });

            let qualifyingCount = seller.strikeCount;
            let triggeredSuspension = false;

            if (type === "STRIKE") {
                qualifyingCount = await calculateQualifyingStrikes(tx, seller.id);

                // Check 3-strike suspension rule
                if (qualifyingCount >= 3) {
                    triggeredSuspension = true;
                    await tx.seller.update({
                        where: { id: seller.id },
                        data: {
                            isBanned: true,
                            status: "DISABLED",
                            bannedAt: new Date(),
                            banReason: `Account suspended: accumulated ${qualifyingCount}/3 Community Guidelines strikes.`
                        }
                    });

                    await tx.sellerSuspension.create({
                        data: {
                            sellerId: seller.id,
                            type: SuspensionType.THREE_STRIKES,
                            reason: `Accumulated 3 valid Community Guidelines strikes (latest reference: ${enforcementReference}).`,
                            adminId
                        }
                    });

                    // In-app Notification for Suspension
                    await tx.notification.create({
                        data: {
                            sellerId: seller.id,
                            type: NotificationType.SELLER_SUSPENDED,
                            channel: NotificationChannel.IN_APP,
                            title: "Seller Account Suspended",
                            body: "Your seller account has been suspended after receiving 3 Community Guidelines strikes. You may appeal this decision in the Appeals section."
                        }
                    });
                }

                // In-app Notification for Strike
                await tx.notification.create({
                    data: {
                        sellerId: seller.id,
                        type: NotificationType.SELLER_STRIKE,
                        channel: NotificationChannel.IN_APP,
                        title: `Community Guidelines Strike (${qualifyingCount}/3)`,
                        body: `A policy strike was issued for violation of clause ${guidelineClause} (${guidelineVersion}): "${reason}". You have the right to appeal.`
                    }
                });
            } else {
                // In-app Notification for Warning
                await tx.notification.create({
                    data: {
                        sellerId: seller.id,
                        type: NotificationType.SELLER_WARNING,
                        channel: NotificationChannel.IN_APP,
                        title: "Notice: Policy Warning Issued",
                        body: `A formal warning has been issued: "${reason}". Warnings do not count as formal strikes.`
                    }
                });
            }

            return {
                strikeRecord,
                qualifyingCount,
                triggeredSuspension
            };
        });

        // Audit Logging
        await logAdminAction({
            adminId,
            actionType:
                type === "WARNING"
                    ? AdminActionType.SELLER_WARNING_ISSUED
                    : AdminActionType.SELLER_STRIKE_ISSUED,
            targetType: "SellerStrike",
            targetId: result.strikeRecord.id,
            description: `${type === "WARNING" ? "Warning" : "Strike"} (${result.strikeRecord.reference}) issued to seller ${result.strikeRecord.sellerId}: ${result.strikeRecord.reason}. Current qualifying count: ${result.qualifyingCount}/3.`,
            previousValue: null,
            newValue: {
                reference: result.strikeRecord.reference,
                type: result.strikeRecord.type,
                reason: result.strikeRecord.reason,
                guidelineClause: result.strikeRecord.guidelineClause,
                qualifyingCount: result.qualifyingCount,
                triggeredSuspension: result.triggeredSuspension
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        if (result.triggeredSuspension) {
            await logAdminAction({
                adminId,
                actionType: AdminActionType.SELLER_SUSPENDED,
                targetType: "Seller",
                targetId: sellerId,
                description: `Seller ${sellerId} automatically suspended upon reaching 3 qualifying strikes.`,
                previousValue: { isBanned: false, status: "ACTIVE" },
                newValue: { isBanned: true, status: "DISABLED", suspensionType: "THREE_STRIKES" },
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"]
            });
        }

        return res.status(201).json({
            enforcement: result.strikeRecord,
            qualifyingCount: result.qualifyingCount,
            triggeredSuspension: result.triggeredSuspension
        });
    } catch (error: any) {
        console.error("ISSUE ENFORCEMENT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/seller-enforcement/:id ─────────────────────────────────────

export const getEnforcementDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);
        const item = await prisma.sellerStrike.findUnique({
            where: { id },
            include: {
                seller: {
                    select: {
                        ...sellerSelect,
                        createdAt: true,
                        bannedAt: true,
                        banReason: true
                    }
                },
                admin: { select: { id: true, firstName: true, lastName: true, email: true } },
                appeal: {
                    include: {
                        events: { orderBy: { createdAt: "asc" } },
                        assignedAdmin: { select: { id: true, firstName: true, lastName: true } },
                        decidedByAdmin: { select: { id: true, firstName: true, lastName: true } }
                    }
                }
            }
        });

        if (!item) {
            return res.status(404).json({ message: "Enforcement record not found" });
        }

        return res.status(200).json({ enforcement: item });
    } catch (error: any) {
        console.error("GET ENFORCEMENT DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── PATCH /api/admin/seller-enforcement/:id/status ───────────────────────────

export const updateEnforcementStatus = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);
        const { status, reason: amendmentReason } = req.body;

        const validStatuses = ["WITHDRAWN", "OVERTURNED", "CLOSED", "UPHELD", "ISSUED"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: `status must be one of: ${validStatuses.join(", ")}`
            });
        }

        if (!amendmentReason || typeof amendmentReason !== "string" || !amendmentReason.trim()) {
            return res.status(400).json({ message: "Amendment/Decision reason is required." });
        }

        const existing = await prisma.sellerStrike.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Enforcement record not found" });
        }

        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.sellerStrike.update({
                where: { id },
                data: {
                    status: status as EnforcementStatus,
                    isActive: status === "WITHDRAWN" || status === "OVERTURNED" ? false : existing.isActive
                },
                include: {
                    seller: { select: sellerSelect }
                }
            });

            const newQualifyingCount = await calculateQualifyingStrikes(tx, existing.sellerId);

            let reinstated = false;
            // If seller was suspended due to three-strikes and now count is < 3
            if (newQualifyingCount < 3) {
                const activeThreeStrikeSuspension = await tx.sellerSuspension.findFirst({
                    where: {
                        sellerId: existing.sellerId,
                        type: SuspensionType.THREE_STRIKES,
                        reinstatedAt: null
                    }
                });

                if (activeThreeStrikeSuspension) {
                    reinstated = true;
                    await tx.seller.update({
                        where: { id: existing.sellerId },
                        data: {
                            isBanned: false,
                            status: "ACTIVE",
                            banReason: null
                        }
                    });

                    await tx.sellerSuspension.update({
                        where: { id: activeThreeStrikeSuspension.id },
                        data: {
                            reinstatedAt: new Date(),
                            reinstatementReason: `Strike ${existing.reference || existing.id} was ${status}: ${amendmentReason.trim()}`,
                            reinstatedByAdminId: adminId
                        }
                    });

                    // In-app Notification for Reinstatement
                    await tx.notification.create({
                        data: {
                            sellerId: existing.sellerId,
                            type: NotificationType.SELLER_REINSTATED,
                            channel: NotificationChannel.IN_APP,
                            title: "Seller Account Reinstated",
                            body: "Your seller account privileges have been restored following enforcement review."
                        }
                    });
                }
            }

            return { updated, newQualifyingCount, reinstated };
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_STRIKE_ISSUED,
            targetType: "SellerStrike",
            targetId: id,
            description: `Enforcement ${existing.reference || existing.id} status changed from ${existing.status} to ${status}: ${amendmentReason.trim()}`,
            previousValue: { status: existing.status, isActive: existing.isActive },
            newValue: {
                status: result.updated.status,
                isActive: result.updated.isActive,
                newQualifyingCount: result.newQualifyingCount,
                reinstated: result.reinstated,
                amendmentReason: amendmentReason.trim()
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({
            enforcement: result.updated,
            qualifyingCount: result.newQualifyingCount,
            reinstated: result.reinstated
        });
    } catch (error: any) {
        console.error("UPDATE ENFORCEMENT STATUS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/seller-enforcement/direct-suspension ─────────────────────

export const directSuspendSeller = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const { sellerId, reason } = req.body;

        if (!sellerId || !reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ message: "sellerId and reason are required" });
        }

        const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
        if (!seller) return res.status(404).json({ message: "Seller not found" });

        const suspension = await prisma.$transaction(async (tx) => {
            await tx.seller.update({
                where: { id: sellerId },
                data: {
                    isBanned: true,
                    status: "DISABLED",
                    bannedAt: new Date(),
                    banReason: reason.trim()
                }
            });

            const record = await tx.sellerSuspension.create({
                data: {
                    sellerId,
                    type: SuspensionType.DIRECT_ADMIN,
                    reason: reason.trim(),
                    adminId
                }
            });

            await tx.notification.create({
                data: {
                    sellerId,
                    type: NotificationType.SELLER_SUSPENDED,
                    channel: NotificationChannel.IN_APP,
                    title: "Account Suspended by Marketplace Administration",
                    body: `Your account has been placed under direct administrative suspension: "${reason.trim()}". Contact support or submit an appeal.`
                }
            });

            return record;
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_SUSPENDED,
            targetType: "Seller",
            targetId: sellerId,
            description: `Direct administrative suspension applied to seller ${sellerId}: ${reason.trim()}`,
            previousValue: { isBanned: seller.isBanned, status: seller.status },
            newValue: { isBanned: true, status: "DISABLED", type: "DIRECT_ADMIN", reason: reason.trim() },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ suspension, message: "Seller suspended successfully" });
    } catch (error: any) {
        console.error("DIRECT SUSPEND ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/seller-enforcement/reinstatement ─────────────────────────

export const reinstateSeller = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const { sellerId, reason } = req.body;

        if (!sellerId || !reason || typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ message: "sellerId and reason are required" });
        }

        const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
        if (!seller) return res.status(404).json({ message: "Seller not found" });

        await prisma.$transaction(async (tx) => {
            await tx.seller.update({
                where: { id: sellerId },
                data: {
                    isBanned: false,
                    status: "ACTIVE",
                    banReason: null
                }
            });

            // Mark active suspensions as reinstated
            await tx.sellerSuspension.updateMany({
                where: { sellerId, reinstatedAt: null },
                data: {
                    reinstatedAt: new Date(),
                    reinstatementReason: reason.trim(),
                    reinstatedByAdminId: adminId
                }
            });

            await tx.notification.create({
                data: {
                    sellerId,
                    type: NotificationType.SELLER_REINSTATED,
                    channel: NotificationChannel.IN_APP,
                    title: "Seller Account Reinstated",
                    body: `Your seller account has been reinstated by marketplace administration. Reason: "${reason.trim()}".`
                }
            });
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_REINSTATED,
            targetType: "Seller",
            targetId: sellerId,
            description: `Seller ${sellerId} reinstated: ${reason.trim()}`,
            previousValue: { isBanned: seller.isBanned, status: seller.status },
            newValue: { isBanned: false, status: "ACTIVE", reinstatementReason: reason.trim() },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ message: "Seller reinstated successfully" });
    } catch (error: any) {
        console.error("REINSTATE SELLER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/seller-enforcement/seller/:sellerId/history ───────────────

export const getSellerEnforcementHistory = async (req: Request, res: Response) => {
    try {
        const sellerId = String(req.params.sellerId);
        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: { shop: true }
        });
        if (!seller) return res.status(404).json({ message: "Seller not found" });

        const [enforcements, suspensions, appeals] = await prisma.$transaction([
            prisma.sellerStrike.findMany({
                where: { sellerId },
                orderBy: { issuedAt: "desc" },
                include: {
                    admin: { select: { id: true, firstName: true, lastName: true, email: true } },
                    appeal: true
                }
            }),
            prisma.sellerSuspension.findMany({
                where: { sellerId },
                orderBy: { suspendedAt: "desc" },
                include: {
                    admin: { select: { id: true, firstName: true, lastName: true } },
                    reinstatedByAdmin: { select: { id: true, firstName: true, lastName: true } }
                }
            }),
            prisma.sellerAppeal.findMany({
                where: { sellerId },
                orderBy: { submittedAt: "desc" },
                include: {
                    events: { orderBy: { createdAt: "asc" } },
                    enforcement: true
                }
            })
        ]);

        const validStrikesCount = enforcements.filter(
            (e) =>
                e.type === EnforcementType.STRIKE &&
                e.isActive &&
                (e.status === EnforcementStatus.ISSUED || e.status === EnforcementStatus.UPHELD)
        ).length;

        const warningsCount = enforcements.filter((e) => e.type === EnforcementType.WARNING).length;

        return res.status(200).json({
            seller: {
                id: seller.id,
                name: `${seller.firstName} ${seller.lastName}`,
                email: seller.email,
                shopName: seller.shop?.name,
                status: seller.status,
                isBanned: seller.isBanned,
                strikeCount: validStrikesCount,
                warningsCount
            },
            enforcements,
            suspensions,
            appeals
        });
    } catch (error: any) {
        console.error("GET SELLER HISTORY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
