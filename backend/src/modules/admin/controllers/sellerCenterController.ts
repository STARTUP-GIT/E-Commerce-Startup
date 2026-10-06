import type { Request, Response } from "express";
import {
    AdminActionType,
    PayoutStatus,
    SellerVerificationStatus,
    StrikeSeverity
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";

const isVerificationStatus = (value: unknown): value is SellerVerificationStatus =>
    typeof value === "string" &&
    (Object.values(SellerVerificationStatus) as string[]).includes(value);

const isSeverity = (value: unknown): value is StrikeSeverity =>
    typeof value === "string" && (Object.values(StrikeSeverity) as string[]).includes(value);

const isPayoutStatus = (value: unknown): value is PayoutStatus =>
    typeof value === "string" && (Object.values(PayoutStatus) as string[]).includes(value);

const sellerSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    username: true,
    shop: { select: { id: true, name: true } }
};

// ─── Seller verifications ─────────────────────────────────────────────────────

export const getVerifications = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const status =
            typeof req.query.status === "string" && req.query.status
                ? req.query.status
                : undefined;
        if (status !== undefined && !isVerificationStatus(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const sellerId =
            typeof req.query.sellerId === "string" && req.query.sellerId
                ? req.query.sellerId
                : undefined;

        const where: Prisma.SellerVerificationWhereInput = {
            ...(status ? { status: status as SellerVerificationStatus } : {}),
            ...(sellerId ? { sellerId } : {})
        };

        const [verifications, total] = await prisma.$transaction([
            prisma.sellerVerification.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                skip,
                take: limit,
                include: { seller: { select: sellerSelect } }
            }),
            prisma.sellerVerification.count({ where })
        ]);

        return res.status(200).json({
            verifications,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET SELLER VERIFICATIONS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

const REVIEWABLE_STATUSES = ["UNDER_REVIEW", "APPROVED", "REJECTED", "EXPIRED"];

export const reviewVerification = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const verificationId = String(req.params.id);
        const { status, rejectionReason } = req.body;

        if (typeof status !== "string" || !REVIEWABLE_STATUSES.includes(status)) {
            return res
                .status(400)
                .json({ message: `status must be one of: ${REVIEWABLE_STATUSES.join(", ")}` });
        }
        if (status === "REJECTED" && (typeof rejectionReason !== "string" || !rejectionReason.trim())) {
            return res
                .status(400)
                .json({ message: "rejectionReason is required when status is REJECTED" });
        }

        const existing = await prisma.sellerVerification.findUnique({
            where: { id: verificationId }
        });
        if (!existing) return res.status(404).json({ message: "Verification not found." });

        const verification = await prisma.sellerVerification.update({
            where: { id: verificationId },
            data: {
                status: status as SellerVerificationStatus,
                reviewedByAdminId: adminId,
                reviewedAt: new Date(),
                ...(typeof rejectionReason === "string" && rejectionReason.trim()
                    ? { rejectionReason: rejectionReason.trim() }
                    : {})
            },
            include: { seller: { select: sellerSelect } }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_VERIFICATION_REVIEWED,
            targetType: "SellerVerification",
            targetId: verification.id,
            description: `Seller verification for seller ${verification.sellerId} set to ${verification.status}`,
            previousValue: { status: existing.status },
            newValue: {
                status: verification.status,
                rejectionReason: verification.rejectionReason
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ verification });
    } catch (error: any) {
        console.error("REVIEW SELLER VERIFICATION ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── Seller strikes ───────────────────────────────────────────────────────────

export const getStrikes = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const sellerId =
            typeof req.query.sellerId === "string" && req.query.sellerId
                ? req.query.sellerId
                : undefined;

        const isActive =
            typeof req.query.isActive === "string" && req.query.isActive !== ""
                ? req.query.isActive === "true"
                : undefined;

        const where: Prisma.SellerStrikeWhereInput = {
            ...(sellerId ? { sellerId } : {}),
            ...(isActive !== undefined ? { isActive } : {})
        };

        const [strikes, total] = await prisma.$transaction([
            prisma.sellerStrike.findMany({
                where,
                orderBy: { issuedAt: "desc" },
                skip,
                take: limit,
                include: {
                    seller: { select: sellerSelect },
                    admin: {
                        select: { id: true, firstName: true, lastName: true, email: true }
                    }
                }
            }),
            prisma.sellerStrike.count({ where })
        ]);

        return res.status(200).json({
            strikes,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET SELLER STRIKES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const createStrike = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const { sellerId, reason, severity, description } = req.body;

        if (typeof sellerId !== "string" || !sellerId.trim()) {
            return res.status(400).json({ message: "sellerId is required" });
        }
        if (typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ message: "reason is required" });
        }
        if (severity !== undefined && !isSeverity(severity)) {
            return res.status(400).json({ message: "Invalid severity" });
        }

        const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
        if (!seller) return res.status(404).json({ message: "Seller not found." });

        const strike = await prisma.sellerStrike.create({
            data: {
                sellerId: seller.id,
                adminId,
                severity: (severity as StrikeSeverity) ?? undefined,
                reason: reason.trim(),
                description: typeof description === "string" ? description : null
            },
            include: {
                seller: { select: sellerSelect },
                admin: { select: { id: true, firstName: true, lastName: true, email: true } }
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_STRIKE_ISSUED,
            targetType: "SellerStrike",
            targetId: strike.id,
            description: `Strike (${strike.severity}) issued to seller ${strike.sellerId}: ${strike.reason}`,
            previousValue: null,
            newValue: {
                sellerId: strike.sellerId,
                severity: strike.severity,
                reason: strike.reason
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(201).json({ strike });
    } catch (error: any) {
        console.error("CREATE SELLER STRIKE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const deactivateStrike = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const strikeId = String(req.params.id);

        const existing = await prisma.sellerStrike.findUnique({ where: { id: strikeId } });
        if (!existing) return res.status(404).json({ message: "Strike not found." });

        const strike = await prisma.sellerStrike.update({
            where: { id: strikeId },
            data: { isActive: false }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_STRIKE_ISSUED,
            targetType: "SellerStrike",
            targetId: strike.id,
            description: `Deactivated strike ${strike.id} on seller ${strike.sellerId} (deactivation, not a new strike)`,
            previousValue: { isActive: existing.isActive },
            newValue: { isActive: strike.isActive },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ message: "Strike removed" });
    } catch (error: any) {
        console.error("DEACTIVATE SELLER STRIKE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── Seller payouts ───────────────────────────────────────────────────────────

export const getPayouts = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const status =
            typeof req.query.status === "string" && req.query.status
                ? req.query.status
                : undefined;
        if (status !== undefined && !isPayoutStatus(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const sellerId =
            typeof req.query.sellerId === "string" && req.query.sellerId
                ? req.query.sellerId
                : undefined;

        const where: Prisma.SellerPayoutWhereInput = {
            ...(status ? { status: status as PayoutStatus } : {}),
            ...(sellerId ? { sellerId } : {})
        };

        const [payouts, total] = await prisma.$transaction([
            prisma.sellerPayout.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                include: {
                    seller: { select: sellerSelect },
                    sellerOrder: {
                        select: {
                            id: true,
                            orderId: true,
                            status: true,
                            order: { select: { id: true, orderNumber: true } }
                        }
                    }
                }
            }),
            prisma.sellerPayout.count({ where })
        ]);

        return res.status(200).json({
            payouts,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET SELLER PAYOUTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updatePayout = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const payoutId = String(req.params.id);
        const { status, failureReason } = req.body;

        if (!isPayoutStatus(status)) {
            return res.status(400).json({
                message: `status must be one of: ${Object.values(PayoutStatus).join(", ")}`
            });
        }

        const existing = await prisma.sellerPayout.findUnique({ where: { id: payoutId } });
        if (!existing) return res.status(404).json({ message: "Payout not found." });

        const data: Prisma.SellerPayoutUpdateInput = { status: status as PayoutStatus };
        if (status === "COMPLETED") data.processedAt = new Date();
        if (status === "FAILED") {
            data.failedAt = new Date();
            if (typeof failureReason === "string" && failureReason.trim()) {
                data.failureReason = failureReason.trim();
            }
        }

        const payout = await prisma.sellerPayout.update({
            where: { id: payoutId },
            data,
            include: {
                seller: { select: sellerSelect },
                sellerOrder: {
                    select: {
                        id: true,
                        orderId: true,
                        status: true,
                        order: { select: { id: true, orderNumber: true } }
                    }
                }
            }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.SELLER_PAYOUT_PROCESSED,
            targetType: "SellerPayout",
            targetId: payout.id,
            description: `Payout ${payout.id} for seller ${payout.sellerId} set to ${payout.status}`,
            previousValue: { status: existing.status },
            newValue: {
                status: payout.status,
                processedAt: payout.processedAt,
                failedAt: payout.failedAt,
                failureReason: payout.failureReason
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ payout });
    } catch (error: any) {
        console.error("UPDATE SELLER PAYOUT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
