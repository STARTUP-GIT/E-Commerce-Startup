import type { Request, Response } from "express";
import {
    AdminActionType,
    CommissionPaymentStatus,
    NotificationChannel,
    NotificationType,
    Prisma,
    StatementStatus
} from "@prisma/client";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";

// ─── GET /api/admin/commission-statements ─────────────────────────────────────

export const getCommissionStatements = async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const sellerId = typeof req.query.sellerId === "string" && req.query.sellerId ? req.query.sellerId : undefined;
        const periodMonth = typeof req.query.periodMonth === "string" && req.query.periodMonth ? req.query.periodMonth : undefined;
        const status = typeof req.query.status === "string" && req.query.status ? (req.query.status as StatementStatus) : undefined;

        const where: Prisma.CommissionStatementWhereInput = {
            ...(sellerId ? { sellerId } : {}),
            ...(periodMonth ? { periodMonth } : {}),
            ...(status ? { status } : {})
        };

        const [statements, total] = await prisma.$transaction([
            prisma.commissionStatement.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                include: {
                    seller: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            shop: { select: { id: true, name: true, commissionPercentage: true } }
                        }
                    },
                    publishedByAdmin: { select: { id: true, firstName: true, lastName: true } },
                    _count: { select: { accessLogs: true, payments: true } }
                }
            }),
            prisma.commissionStatement.count({ where })
        ]);

        return res.status(200).json({
            statements,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        console.error("GET COMMISSION STATEMENTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/commission-statements/:id ─────────────────────────────────

export const getCommissionStatementDetail = async (req: Request, res: Response) => {
    try {
        const id = String(req.params.id);

        const statement = await prisma.commissionStatement.findUnique({
            where: { id },
            include: {
                seller: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        shop: { select: { id: true, name: true, commissionPercentage: true } }
                    }
                },
                publishedByAdmin: { select: { id: true, firstName: true, lastName: true, email: true } },
                accessLogs: {
                    orderBy: { accessedAt: "desc" },
                    take: 20
                },
                payments: {
                    orderBy: { createdAt: "desc" }
                }
            }
        });

        if (!statement) return res.status(404).json({ message: "Commission statement not found" });

        return res.status(200).json({ statement });
    } catch (error: any) {
        console.error("GET COMMISSION STATEMENT DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET /api/admin/commission-statements/prepare ─────────────────────────────

export const preparePeriodData = async (req: Request, res: Response) => {
    try {
        const { sellerId, periodMonth } = req.query;

        if (!sellerId || typeof sellerId !== "string" || !periodMonth || typeof periodMonth !== "string") {
            return res.status(400).json({ message: "sellerId and periodMonth (YYYY-MM) are required" });
        }

        const [yearStr, monthStr] = (periodMonth as string).split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({ message: "Invalid periodMonth format. Use YYYY-MM." });
        }

        const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const seller = await prisma.seller.findUnique({
            where: { id: sellerId },
            include: { shop: true }
        });
        if (!seller) return res.status(404).json({ message: "Seller not found" });

        // Load non-cancelled orders for this seller in this date range
        const sellerOrders = await prisma.sellerOrder.findMany({
            where: {
                sellerId,
                status: { not: "CANCELLED" },
                createdAt: { gte: startDate, lte: endDate }
            },
            select: {
                id: true,
                orderId: true,
                subtotal: true,
                platformCommission: true,
                sellerEarnings: true,
                createdAt: true,
                order: { select: { orderNumber: true, placedAt: true } }
            }
        });

        const eligibleOrdersCount = sellerOrders.length;
        const eligibleOrderIds = sellerOrders.map((so) => so.id);
        const commissionableBase = sellerOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
        const commissionAccrued = sellerOrders.reduce((sum, o) => sum + Number(o.platformCommission), 0);
        const applicableRate = seller.shop?.commissionPercentage ?? 10.0;

        // Sum previous confirmed payments in this period
        const previousPaymentsAgg = await prisma.sellerCommissionPayment.aggregate({
            where: {
                sellerId,
                status: CommissionPaymentStatus.COMPLETED,
                createdAt: { gte: startDate, lte: endDate }
            },
            _sum: { amount: true }
        });
        const paymentsReceived = Number(previousPaymentsAgg._sum.amount || 0);
        const outstandingBalance = Math.max(0, commissionAccrued - paymentsReceived);

        return res.status(200).json({
            seller: {
                id: seller.id,
                name: `${seller.firstName} ${seller.lastName}`,
                shopName: seller.shop?.name,
                commissionPercentage: applicableRate
            },
            periodMonth,
            startDate,
            endDate,
            eligibleOrdersCount,
            eligibleOrderIds,
            commissionableBase,
            applicableRate,
            commissionAccrued,
            adjustments: 0,
            paymentsReceived,
            outstandingBalance,
            ordersSample: sellerOrders.slice(0, 10)
        });
    } catch (error: any) {
        console.error("PREPARE PERIOD DATA ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/commission-statements ────────────────────────────────────

export const createCommissionStatement = async (req: Request, res: Response) => {
    try {
        const {
            sellerId,
            periodMonth,
            title,
            startDate,
            endDate,
            eligibleOrdersCount = 0,
            eligibleOrderIds = [],
            commissionableBase = 0,
            applicableRate = 10,
            commissionAccrued = 0,
            adjustments = 0,
            paymentsReceived = 0,
            outstandingBalance = 0,
            documentUrl,
            notes
        } = req.body;

        if (!sellerId || !periodMonth || !title) {
            return res.status(400).json({ message: "sellerId, periodMonth, and title are required" });
        }

        const statementNumber = `CMS-${periodMonth.replace("-", "")}-${Date.now().toString(36).toUpperCase()}`;

        const statement = await prisma.commissionStatement.create({
            data: {
                statementNumber,
                sellerId,
                periodMonth,
                title: title.trim(),
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : new Date(),
                status: StatementStatus.DRAFT,
                eligibleOrdersCount: Number(eligibleOrdersCount),
                eligibleOrderIds: Array.isArray(eligibleOrderIds) ? eligibleOrderIds : [],
                commissionableBase: new Prisma.Decimal(commissionableBase),
                applicableRate: Number(applicableRate),
                commissionAccrued: new Prisma.Decimal(commissionAccrued),
                adjustments: new Prisma.Decimal(adjustments),
                paymentsReceived: new Prisma.Decimal(paymentsReceived),
                outstandingBalance: new Prisma.Decimal(outstandingBalance),
                documentUrl: documentUrl || null,
                notes: notes ? notes.trim() : null
            }
        });

        return res.status(201).json({ statement });
    } catch (error: any) {
        console.error("CREATE COMMISSION STATEMENT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/commission-statements/:id/publish ────────────────────────

export const publishCommissionStatement = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const id = String(req.params.id);

        const existing = await prisma.commissionStatement.findUnique({
            where: { id },
            include: { seller: true }
        });
        if (!existing) return res.status(404).json({ message: "Statement not found" });

        const published = await prisma.$transaction(async (tx) => {
            const resStatement = await tx.commissionStatement.update({
                where: { id },
                data: {
                    status: StatementStatus.PUBLISHED,
                    publishedAt: new Date(),
                    publishedByAdminId: adminId
                }
            });

            await tx.notification.create({
                data: {
                    sellerId: existing.sellerId,
                    type: NotificationType.COMMISSION_STATEMENT,
                    channel: NotificationChannel.IN_APP,
                    title: `Monthly Commission Statement Published (${existing.periodMonth})`,
                    body: `Statement ${existing.statementNumber} for period ${existing.periodMonth} is available. Accrued Commission: INR ${Number(existing.commissionAccrued).toFixed(2)}. Outstanding: INR ${Number(existing.outstandingBalance).toFixed(2)}.`
                }
            });

            return resStatement;
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.COMMISSION_STATEMENT_PUBLISHED,
            targetType: "CommissionStatement",
            targetId: id,
            description: `Published monthly commission statement ${published.statementNumber} for seller ${published.sellerId} (Period: ${published.periodMonth}). Outstanding: INR ${Number(published.outstandingBalance).toFixed(2)}.`,
            previousValue: { status: existing.status },
            newValue: {
                status: published.status,
                statementNumber: published.statementNumber,
                publishedAt: published.publishedAt,
                outstandingBalance: published.outstandingBalance
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(200).json({ statement: published });
    } catch (error: any) {
        console.error("PUBLISH STATEMENT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── POST /api/admin/commission-statements/payments ───────────────────────────

export const recordCommissionPayment = async (req: Request, res: Response) => {
    try {
        const adminId = req.adminId!;
        const { sellerId, statementId, amount, paymentMethod = "BANK_TRANSFER", transactionReference, notes } = req.body;

        if (!sellerId || !amount || Number(amount) <= 0) {
            return res.status(400).json({ message: "sellerId and a positive amount are required." });
        }

        const payment = await prisma.$transaction(async (tx) => {
            const pay = await tx.sellerCommissionPayment.create({
                data: {
                    sellerId,
                    statementId: statementId || null,
                    amount: new Prisma.Decimal(amount),
                    status: CommissionPaymentStatus.COMPLETED,
                    paymentMethod,
                    transactionReference: transactionReference ? transactionReference.trim() : null,
                    notes: notes ? notes.trim() : null,
                    confirmedAt: new Date()
                }
            });

            // Update statement balance if associated
            if (statementId) {
                const stmt = await tx.commissionStatement.findUnique({ where: { id: statementId } });
                if (stmt) {
                    const newPaymentsReceived = Number(stmt.paymentsReceived) + Number(amount);
                    const newOutstanding = Math.max(0, Number(stmt.commissionAccrued) - newPaymentsReceived);
                    await tx.commissionStatement.update({
                        where: { id: statementId },
                        data: {
                            paymentsReceived: new Prisma.Decimal(newPaymentsReceived),
                            outstandingBalance: new Prisma.Decimal(newOutstanding)
                        }
                    });
                }
            }

            return pay;
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.COMMISSION_PAYMENT_RECORDED,
            targetType: "SellerCommissionPayment",
            targetId: payment.id,
            description: `Recorded seller commission payment of INR ${Number(payment.amount).toFixed(2)} for seller ${sellerId}. Ref: ${transactionReference || "N/A"}.`,
            previousValue: null,
            newValue: {
                sellerId,
                amount: payment.amount,
                statementId,
                confirmedAt: payment.confirmedAt
            },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
        });

        return res.status(201).json({ payment, message: "Commission payment recorded successfully." });
    } catch (error: any) {
        console.error("RECORD COMMISSION PAYMENT ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
