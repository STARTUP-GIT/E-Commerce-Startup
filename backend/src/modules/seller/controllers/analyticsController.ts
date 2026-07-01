import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getDashboard = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const thresholdParam = req.query.threshold as string;
        const threshold = thresholdParam !== undefined ? parseInt(thresholdParam, 10) : 10;

        const [
            totalProducts,
            activeProducts,
            deletedProducts,
            totalOrders,
            pendingOrders,
            processingOrders,
            readyToShipOrders,
            shippedOrders,
            deliveredOrders,
            cancelledOrders,
            lowStockProducts
        ] = await Promise.all([
            prisma.product.count({ where: { sellerId } }),
            prisma.product.count({ where: { sellerId, isDeleted: false } }),
            prisma.product.count({ where: { sellerId, isDeleted: true } }),
            prisma.sellerOrder.count({ where: { sellerId } }),
            prisma.sellerOrder.count({ where: { sellerId, status: "PENDING" } }),
            prisma.sellerOrder.count({ where: { sellerId, status: "PROCESSING" } }),
            prisma.sellerOrder.count({ where: { sellerId, status: "READY_TO_SHIP" } }),
            prisma.sellerOrder.count({ where: { sellerId, status: "SHIPPED" } }),
            prisma.sellerOrder.count({ where: { sellerId, status: "DELIVERED" } }),
            prisma.sellerOrder.count({ where: { sellerId, status: "CANCELLED" } }),
            prisma.product.count({
                where: {
                    sellerId,
                    isDeleted: false,
                    stockQuantity: {
                        lte: threshold
                    }
                }
            })
        ]);

        const deliveredOrdersList = await prisma.sellerOrder.findMany({
            where: {
                sellerId,
                status: "DELIVERED"
            },
            select: {
                sellerEarnings: true,
                createdAt: true
            }
        });

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let totalRevenue = 0;
        let monthlyRevenue = 0;
        let todaysRevenue = 0;

        for (const order of deliveredOrdersList) {
            const earnings = Number(order.sellerEarnings || 0);
            totalRevenue += earnings;
            if (order.createdAt >= startOfMonth) {
                monthlyRevenue += earnings;
            }
            if (order.createdAt >= startOfToday) {
                todaysRevenue += earnings;
            }
        }

        return res.status(200).json({
            totalProducts,
            activeProducts,
            deletedProducts,
            totalOrders,
            pendingOrders,
            processingOrders,
            readyToShipOrders,
            shippedOrders,
            deliveredOrders,
            cancelledOrders,
            lowStockProducts,
            totalRevenue,
            monthlyRevenue,
            "today'sRevenue": todaysRevenue
        });

    } catch (error) {
        console.error("GET DASHBOARD ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getSalesSummary = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        const recentDeliveredOrders = await prisma.sellerOrder.findMany({
            where: {
                sellerId,
                status: "DELIVERED",
                createdAt: {
                    gte: oneYearAgo
                }
            },
            select: {
                sellerEarnings: true,
                createdAt: true
            }
        });

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let todaySales = 0;
        let weeklySales = 0;
        let monthlySales = 0;
        let yearlySales = 0;

        for (const order of recentDeliveredOrders) {
            const earnings = Number(order.sellerEarnings || 0);
            const date = new Date(order.createdAt);
            if (date >= todayStart) {
                todaySales += earnings;
            }
            if (date >= sevenDaysAgo) {
                weeklySales += earnings;
            }
            if (date >= thirtyDaysAgo) {
                monthlySales += earnings;
            }
            yearlySales += earnings;
        }

        return res.status(200).json({
            todaySales,
            weeklySales,
            monthlySales,
            yearlySales
        });

    } catch (error) {
        console.error("GET SALES SUMMARY ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getRevenue = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const { period = "daily", startDate, endDate } = req.query;
        const where: any = {
            sellerId,
            status: "DELIVERED"
        };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate as string);
            if (endDate) where.createdAt.lte = new Date(endDate as string);
        }

        const orders = await prisma.sellerOrder.findMany({
            where,
            select: {
                sellerEarnings: true,
                createdAt: true
            },
            orderBy: {
                createdAt: "asc"
            }
        });

        const revenueByPeriod: { [key: string]: number } = {};
        for (const order of orders) {
            const date = new Date(order.createdAt);
            let key = "";
            if (period === "daily") {
                key = date.toISOString().split("T")[0];
            } else if (period === "weekly") {
                const day = date.getDay();
                const diff = date.getDate() - day + (day === 0 ? -6 : 1);
                const startOfWeek = new Date(date.setDate(diff));
                key = startOfWeek.toISOString().split("T")[0] + " (Week)";
            } else if (period === "monthly") {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            } else if (period === "yearly") {
                key = `${date.getFullYear()}`;
            } else {
                key = date.toISOString().split("T")[0];
            }
            revenueByPeriod[key] = (revenueByPeriod[key] || 0) + Number(order.sellerEarnings || 0);
        }

        return res.status(200).json({
            period,
            revenue: revenueByPeriod
        });

    } catch (error) {
        console.error("GET REVENUE ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getMonthlyRevenue = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const orders = await prisma.sellerOrder.findMany({
            where: {
                sellerId,
                status: "DELIVERED",
                createdAt: {
                    gte: startOfMonth
                }
            },
            select: {
                sellerEarnings: true,
                createdAt: true
            },
            orderBy: {
                createdAt: "asc"
            }
        });

        const dailyRevenue: { [day: string]: number } = {};
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
            dailyRevenue[dayStr] = 0;
        }

        for (const order of orders) {
            const dayStr = order.createdAt.toISOString().split("T")[0];
            if (dailyRevenue[dayStr] !== undefined) {
                dailyRevenue[dayStr] += Number(order.sellerEarnings || 0);
            } else {
                dailyRevenue[dayStr] = Number(order.sellerEarnings || 0);
            }
        }

        return res.status(200).json({
            month: now.toLocaleString("default", { month: "long" }),
            year: now.getFullYear(),
            revenue: dailyRevenue
        });

    } catch (error) {
        console.error("GET MONTHLY REVENUE ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getTopSellingProducts = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const limitParam = req.query.limit as string;
        const limit = limitParam ? parseInt(limitParam, 10) : 10;

        const topSelling = await prisma.orderItem.groupBy({
            by: ["productId"],
            where: {
                product: {
                    sellerId
                },
                sellerOrder: {
                    status: "DELIVERED"
                }
            },
            _sum: {
                quantity: true
            },
            orderBy: {
                _sum: {
                    quantity: "desc"
                }
            },
            take: limit
        });

        const productsWithQuantities = await Promise.all(
            topSelling.map(async (item) => {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId }
                });
                return {
                    product,
                    quantitySold: item._sum.quantity || 0
                };
            })
        );

        return res.status(200).json({
            products: productsWithQuantities
        });

    } catch (error) {
        console.error("GET TOP SELLING PRODUCTS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getLowStockProducts = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const thresholdParam = req.query.threshold as string;
        const threshold = thresholdParam !== undefined ? parseInt(thresholdParam, 10) : 10;

        if (isNaN(threshold) || threshold < 0) {
            return res.status(400).json({
                message: "Threshold must be a non-negative integer"
            });
        }

        const products = await prisma.product.findMany({
            where: {
                sellerId,
                isDeleted: false,
                stockQuantity: {
                    lte: threshold
                }
            },
            orderBy: {
                stockQuantity: "asc"
            }
        });

        return res.status(200).json({
            count: products.length,
            products
        });

    } catch (error) {
        console.error("GET LOW STOCK PRODUCTS ANALYTICS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getRecentOrders = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const limitParam = req.query.limit as string;
        const limit = limitParam ? parseInt(limitParam, 10) : 10;

        const orders = await prisma.sellerOrder.findMany({
            where: {
                sellerId
            },
            include: {
                order: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            take: limit
        });

        return res.status(200).json({
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error("GET RECENT ORDERS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};