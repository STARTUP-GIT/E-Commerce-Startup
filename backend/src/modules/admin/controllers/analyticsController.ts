import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

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

        // Banned count from isBanned flag
        const bannedSellersCount = await prisma.seller.count({ where: { isBanned: true } });
        sellersCount.banned = bannedSellersCount;

        // 2. Customers
        const totalCustomers = await prisma.customer.count();

        // 3. Shops
        const totalShops = await prisma.shop.count();

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

        // 7. Today's and Monthly Revenue
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const todayOrders = await prisma.order.aggregate({
            where: {
                createdAt: { gte: todayStart },
                status: { not: "CANCELLED" }
            },
            _sum: { grandTotal: true }
        });

        const monthlyOrders = await prisma.order.aggregate({
            where: {
                createdAt: { gte: monthStart },
                status: { not: "CANCELLED" }
            },
            _sum: { grandTotal: true }
        });

        const todayRevenue = Number(todayOrders._sum.grandTotal || 0);
        const monthlyRevenue = Number(monthlyOrders._sum.grandTotal || 0);

        // 8. Platform Revenue (Sum of commission and fees from seller orders)
        const sellerOrdersRevenue = await prisma.sellerOrder.aggregate({
            _sum: {
                platformCommission: true,
                platformFee: true
            }
        });
        const platformRevenue = Number(sellerOrdersRevenue._sum.platformCommission || 0) + Number(sellerOrdersRevenue._sum.platformFee || 0);

        // 9. Pending Packing Requests
        const pendingPackingRequests = await prisma.shop.count({
            where: {
                enablePackingFee: true,
                packingFeeApproved: false
            }
        });

        // 10. Recents
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

        // 11. Low Stock Products (stock <= 10)
        const lowStockProducts = await prisma.product.findMany({
            where: {
                isDeleted: false,
                stockQuantity: { lte: 10 }
            },
            take: 5
        });

        return res.status(200).json({
            sellersCount,
            totalCustomers,
            totalShops,
            totalProducts,
            ordersCount,
            totalPayments,
            todayRevenue,
            monthlyRevenue,
            platformRevenue,
            pendingPackingRequests,
            recentOrders,
            recentSellers,
            recentCustomers,
            lowStockProducts
        });
    } catch (error: any) {
        console.error("DASHBOARD ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getRevenue = async (req: Request, res: Response) => {
    try {
        // Daily Platform Revenue for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                status: { not: "CANCELLED" }
            },
            select: {
                createdAt: true,
                grandTotal: true
            }
        });

        const dailyRevenueMap: { [date: string]: number } = {};
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            dailyRevenueMap[dateStr] = 0;
        }

        orders.forEach(o => {
            const dateStr = o.createdAt.toISOString().split("T")[0];
            if (dailyRevenueMap[dateStr] !== undefined) {
                dailyRevenueMap[dateStr] += Number(o.grandTotal);
            }
        });

        const dailyRevenue = Object.keys(dailyRevenueMap).map(date => ({
            date,
            revenue: dailyRevenueMap[date]
        })).sort((a, b) => a.date.localeCompare(b.date));

        const totalAccruedRevenue = await prisma.order.aggregate({
            where: { status: { not: "CANCELLED" } },
            _sum: { grandTotal: true }
        });

        return res.status(200).json({
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
        // Platform revenue grouped by month
        const orders = await prisma.order.findMany({
            where: { status: { not: "CANCELLED" } },
            select: {
                createdAt: true,
                grandTotal: true
            }
        });

        const monthlyRevenueMap: { [month: string]: number } = {};

        orders.forEach(o => {
            const monthStr = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, "0")}`;
            monthlyRevenueMap[monthStr] = (monthlyRevenueMap[monthStr] || 0) + Number(o.grandTotal);
        });

        const monthlyRevenue = Object.keys(monthlyRevenueMap).map(month => ({
            month,
            revenue: monthlyRevenueMap[month]
        })).sort((a, b) => a.month.localeCompare(b.month));

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
