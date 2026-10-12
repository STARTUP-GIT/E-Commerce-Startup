import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { CommissionPaymentStatus } from "@prisma/client";

export const getDashboard = async (req: Request, res: Response) => {
    try {
        // 1. Sellers by Status
        const sellersGroup = await prisma.seller.groupBy({
            by: ["status"],
            _count: { id: true }
        });
        const sellersCount = {
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            banned: 0
        };
        for (const item of sellersGroup) {
            sellersCount.total += item._count.id;
            if (item.status === "ACTIVE") sellersCount.approved = item._count.id;
            else if (item.status === "DISABLED") sellersCount.pending += item._count.id;
            else if (item.status === "BANNED") sellersCount.banned = item._count.id;
        }

        const bannedSellersCount = await prisma.seller.count({ where: { isBanned: true } });
        sellersCount.banned = bannedSellersCount;

        // 2. Customers
        const totalCustomers = await prisma.customer.count();

        // 3. Shops
        const totalShops = await prisma.shop.count();
        const pendingShopApprovals = await prisma.shop.count({ where: { status: "PENDING" } });
        const activeShops = await prisma.shop.count({ where: { status: "APPROVED" } });
        const inactiveShops = await prisma.shop.count({ where: { status: { notIn: ["PENDING", "APPROVED"] } } });

        // 4. Products
        const totalProducts = await prisma.product.count({ where: { isDeleted: false } });

        // 5. Orders by Status
        const ordersGroup = await prisma.order.groupBy({
            by: ["status"],
            _count: { id: true }
        });
        const ordersCount = {
            total: 0,
            pending: 0,
            processing: 0,
            delivered: 0,
            cancelled: 0
        };
        for (const item of ordersGroup) {
            ordersCount.total += item._count.id;
            if (item.status === "PENDING") ordersCount.pending = item._count.id;
            else if (item.status === "PROCESSING") ordersCount.processing = item._count.id;
            else if (item.status === "DELIVERED") ordersCount.delivered = item._count.id;
            else if (item.status === "CANCELLED") ordersCount.cancelled = item._count.id;
        }

        // 6. Payments
        const totalPayments = await prisma.payment.count();

        // 7. Distinct Marketplace Financial Aggregates
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        // A. Gross Order Value (GOV)
        const totalAccruedOrders = await prisma.order.aggregate({
            where: { status: { not: "CANCELLED" } },
            _sum: { grandTotal: true, platformFeeTotal: true }
        });
        const grossOrderValue = Number(totalAccruedOrders._sum.grandTotal || 0);

        const todayGovAgg = await prisma.order.aggregate({
            where: { createdAt: { gte: todayStart }, status: { not: "CANCELLED" } },
            _sum: { grandTotal: true }
        });
        const todayGrossOrderValue = Number(todayGovAgg._sum.grandTotal || 0);

        const monthlyGovAgg = await prisma.order.aggregate({
            where: { createdAt: { gte: monthStart }, status: { not: "CANCELLED" } },
            _sum: { grandTotal: true }
        });
        const monthlyGrossOrderValue = Number(monthlyGovAgg._sum.grandTotal || 0);

        // B. Platform Fees Collected (immediate checkout flow from paid orders)
        const paidOrdersFeeAgg = await prisma.order.aggregate({
            where: {
                payments: { some: { status: "COMPLETED" } },
                status: { not: "CANCELLED" }
            },
            _sum: { platformFeeTotal: true }
        });
        const platformFeesCollected = Number(paidOrdersFeeAgg._sum?.platformFeeTotal || 0);

        // C. Seller Commission Accrued (accumulated from seller orders)
        const sellerOrdersCommissionAgg = await prisma.sellerOrder.aggregate({
            where: { order: { status: { not: "CANCELLED" } } },
            _sum: { platformCommission: true }
        });
        const commissionAccrued = Number(sellerOrdersCommissionAgg._sum.platformCommission || 0);

        // D. Seller Commission Collected (confirmed bank transfers / settlements from sellers)
        const confirmedCommissionPaymentsAgg = await prisma.sellerCommissionPayment.aggregate({
            where: { status: CommissionPaymentStatus.COMPLETED },
            _sum: { amount: true }
        });
        const commissionCollected = Number(confirmedCommissionPaymentsAgg._sum.amount || 0);

        // E. Outstanding & Overdue Seller Commission
        const outstandingCommission = Math.max(0, commissionAccrued - commissionCollected);

        // Overdue from published statements past their period end date with balance > 0
        const overdueStatementsAgg = await prisma.commissionStatement.aggregate({
            where: {
                status: "PUBLISHED",
                endDate: { lt: new Date() },
                outstandingBalance: { gt: 0 }
            },
            _sum: { outstandingBalance: true }
        });
        const overdueCommission = Number(overdueStatementsAgg._sum.outstandingBalance || 0);

        // F. Refunds & Adjustments
        const refundsAgg = await prisma.payment.aggregate({
            where: { status: "REFUNDED" },
            _sum: { amount: true }
        });
        const refundsTotal = Number(refundsAgg._sum.amount || 0);

        // G. Net Platform Earnings = Platform Fees Collected + Seller Commission Collected - Platform Refund Portion
        // (Clean accounting definition: cash actually collected by platform)
        const netPlatformEarnings = platformFeesCollected + commissionCollected;

        // 8. Pending Packing Requests
        const pendingPackingRequests = await prisma.shop.count({
            where: {
                enablePackingFee: true,
                packingFeeApproved: false
            }
        });

        // 9. Recents
        const recentOrders = await prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
                customer: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            }
        });

        const recentSellers = await prisma.seller.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: { shop: true }
        });

        const recentCustomers = await prisma.customer.findMany({
            take: 5,
            orderBy: { createdAt: "desc" }
        });

        const lowStockProducts = await prisma.product.findMany({
            where: {
                isDeleted: false,
                stockQuantity: { lte: 10 }
            },
            take: 5
        });

        // 10. Workload counters
        const [
            pendingSellers,
            pendingProducts,
            pendingVerifications,
            pendingReturns,
            openTickets,
            newCustomersThisMonth,
            newSellersThisMonth,
            refundsThisMonth,
            pendingPayoutAgg
        ] = await Promise.all([
            prisma.seller.count({ where: { status: "DISABLED" } }),
            prisma.product.count({ where: { status: "PENDING_APPROVAL" } }),
            prisma.sellerVerification.count({ where: { status: "PENDING" } }),
            prisma.returnRequest.count({ where: { status: { in: ["REQUESTED", "PENDING_REVIEW"] } } }),
            prisma.supportTicket.count({
                where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "WAITING_ON_SELLER"] } }
            }),
            prisma.customer.count({ where: { createdAt: { gte: monthStart } } }),
            prisma.seller.count({ where: { createdAt: { gte: monthStart } } }),
            prisma.payment.count({
                where: { status: "REFUNDED", refundedAt: { gte: monthStart } }
            }),
            prisma.sellerPayout.aggregate({
                where: { status: "PENDING" },
                _sum: { amount: true }
            })
        ]);

        const pendingPayoutAmount = Number(pendingPayoutAgg._sum.amount || 0);

        return res.status(200).json({
            sellersCount,
            totalCustomers,
            totalShops,
            pendingShopApprovals,
            activeShops,
            inactiveShops,
            totalProducts,
            ordersCount,
            totalPayments,
            // Financial Breakdown (Part 8)
            grossOrderValue,
            todayGrossOrderValue,
            monthlyGrossOrderValue,
            platformFeesCollected,
            commissionAccrued,
            commissionCollected,
            outstandingCommission,
            overdueCommission,
            netPlatformEarnings,
            refundsTotal,
            // Legacy aliases for backward compatibility with existing components
            totalRevenue: grossOrderValue,
            platformRevenue: netPlatformEarnings,
            todayRevenue: todayGrossOrderValue,
            monthlyRevenue: monthlyGrossOrderValue,
            pendingPackingRequests,
            recentOrders,
            recentSellers,
            recentCustomers,
            lowStockProducts,
            pendingSellers,
            pendingProducts,
            pendingVerifications,
            pendingReturns,
            openTickets,
            newCustomersThisMonth,
            newSellersThisMonth,
            revenueToday: todayGrossOrderValue,
            revenueThisMonth: monthlyGrossOrderValue,
            refundsThisMonth,
            pendingPayoutAmount
        });
    } catch (error: any) {
        console.error("DASHBOARD ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getRevenue = async (req: Request, res: Response) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                status: { not: "CANCELLED" }
            },
            select: {
                createdAt: true,
                grandTotal: true,
                platformFeeTotal: true
            }
        });

        const dailyMap: { [date: string]: { date: string; grossOrderValue: number; platformFee: number } } = {};
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            dailyMap[dateStr] = { date: dateStr, grossOrderValue: 0, platformFee: 0 };
        }

        orders.forEach(o => {
            const dateStr = o.createdAt.toISOString().split("T")[0];
            if (dailyMap[dateStr]) {
                dailyMap[dateStr].grossOrderValue += Number(o.grandTotal || 0);
                dailyMap[dateStr].platformFee += Number(o.platformFeeTotal || 0);
            }
        });

        const dailyRevenue = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

        const totalAccruedRevenue = await prisma.order.aggregate({
            where: { status: { not: "CANCELLED" } },
            _sum: { grandTotal: true, platformFeeTotal: true }
        });

        return res.status(200).json({
            grossOrderValue: Number(totalAccruedRevenue._sum.grandTotal || 0),
            platformFeesTotal: Number(totalAccruedRevenue._sum.platformFeeTotal || 0),
            totalRevenue: Number(totalAccruedRevenue._sum.grandTotal || 0),
            dailyRevenue
        });
    } catch (error: any) {
        console.error("GET REVENUE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getMonthlyRevenue = async (req: Request, res: Response) => {
    try {
        // Collect monthly aggregates for distinct financial series
        const [orders, sellerOrders, commissionPayments, refunds] = await Promise.all([
            prisma.order.findMany({
                where: { status: { not: "CANCELLED" } },
                select: {
                    createdAt: true,
                    grandTotal: true,
                    platformFeeTotal: true,
                    payments: { select: { status: true } }
                }
            }),
            prisma.sellerOrder.findMany({
                where: { order: { status: { not: "CANCELLED" } } },
                select: { createdAt: true, platformCommission: true }
            }),
            prisma.sellerCommissionPayment.findMany({
                where: { status: CommissionPaymentStatus.COMPLETED },
                select: { confirmedAt: true, createdAt: true, amount: true }
            }),
            prisma.payment.findMany({
                where: { status: "REFUNDED" },
                select: { refundedAt: true, createdAt: true, amount: true }
            })
        ]);

        const monthlyMap: {
            [month: string]: {
                month: string;
                grossOrderValue: number;
                platformFeesCollected: number;
                commissionAccrued: number;
                commissionCollected: number;
                refunds: number;
                netPlatformEarnings: number;
                // Legacy revenue alias
                revenue: number;
            };
        } = {};

        const getMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

        orders.forEach(o => {
            const m = getMonthKey(o.createdAt);
            if (!monthlyMap[m]) {
                monthlyMap[m] = {
                    month: m,
                    grossOrderValue: 0,
                    platformFeesCollected: 0,
                    commissionAccrued: 0,
                    commissionCollected: 0,
                    refunds: 0,
                    netPlatformEarnings: 0,
                    revenue: 0
                };
            }
            monthlyMap[m].grossOrderValue += Number(o.grandTotal || 0);
            if (o.payments.some(p => p.status === "COMPLETED")) {
                monthlyMap[m].platformFeesCollected += Number(o.platformFeeTotal || 0);
            }
        });

        sellerOrders.forEach(so => {
            const m = getMonthKey(so.createdAt);
            if (monthlyMap[m]) {
                monthlyMap[m].commissionAccrued += Number(so.platformCommission || 0);
            }
        });

        commissionPayments.forEach(cp => {
            const date = cp.confirmedAt || cp.createdAt;
            const m = getMonthKey(date);
            if (monthlyMap[m]) {
                monthlyMap[m].commissionCollected += Number(cp.amount || 0);
            }
        });

        refunds.forEach(rf => {
            const date = rf.refundedAt || rf.createdAt;
            const m = getMonthKey(date);
            if (monthlyMap[m]) {
                monthlyMap[m].refunds += Number(rf.amount || 0);
            }
        });

        // Compute netPlatformEarnings for each month
        for (const m in monthlyMap) {
            monthlyMap[m].netPlatformEarnings = monthlyMap[m].platformFeesCollected + monthlyMap[m].commissionCollected;
            monthlyMap[m].revenue = monthlyMap[m].netPlatformEarnings;
        }

        const monthlyRevenue = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

        return res.status(200).json({ monthlyRevenue });
    } catch (error: any) {
        console.error("GET MONTHLY REVENUE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getStatistics = async (req: Request, res: Response) => {
    try {
        const counts = {
            sellers: await prisma.seller.count(),
            customers: await prisma.customer.count(),
            shops: await prisma.shop.count(),
            products: await prisma.product.count({ where: { isDeleted: false } }),
            orders: await prisma.order.count(),
            payments: await prisma.payment.count(),
            coupons: await prisma.coupon.count(),
            reviews: await prisma.review.count()
        };
        return res.status(200).json({ counts });
    } catch (error: any) {
        console.error("GET STATISTICS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getRecentActivities = async (req: Request, res: Response) => {
    try {
        const activities = await prisma.adminAction.findMany({
            take: 20,
            orderBy: { performedAt: "desc" },
            include: {
                admin: {
                    select: { id: true, email: true, firstName: true, lastName: true }
                }
            }
        });
        return res.status(200).json({ activities });
    } catch (error: any) {
        console.error("GET RECENT ACTIVITIES ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
