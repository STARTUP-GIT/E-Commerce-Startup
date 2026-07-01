import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

export const getPayoutHistory = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const payouts = await prisma.sellerPayout.findMany({
            where: {
                sellerId
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            count: payouts.length,
            payouts
        });

    } catch (error) {
        console.error("GET PAYOUT HISTORY ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getPendingPayouts = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const payouts = await prisma.sellerPayout.findMany({
            where: {
                sellerId,
                status: {
                    in: ["PENDING", "PROCESSING"]
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            count: payouts.length,
            payouts
        });

    } catch (error) {
        console.error("GET PENDING PAYOUTS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getCompletedPayouts = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const payouts = await prisma.sellerPayout.findMany({
            where: {
                sellerId,
                status: "COMPLETED"
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            count: payouts.length,
            payouts
        });

    } catch (error) {
        console.error("GET COMPLETED PAYOUTS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getTotalEarnings = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const [earningsAgg, completedAgg, pendingAgg] = await Promise.all([
            prisma.sellerOrder.aggregate({
                where: { sellerId, status: "DELIVERED" },
                _sum: { sellerEarnings: true }
            }),
            prisma.sellerPayout.aggregate({
                where: { sellerId, status: "COMPLETED" },
                _sum: { amount: true }
            }),
            prisma.sellerPayout.aggregate({
                where: {
                    sellerId,
                    status: { in: ["PENDING", "PROCESSING"] }
                },
                _sum: { amount: true }
            })
        ]);

        const totalEarnings = Number(earningsAgg._sum.sellerEarnings || 0);
        const totalPaid = Number(completedAgg._sum.amount || 0);
        const totalPending = Number(pendingAgg._sum.amount || 0);

        return res.status(200).json({
            totalEarnings,
            totalPaid,
            totalPending
        });

    } catch (error) {
        console.error("GET TOTAL EARNINGS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getEarningsSummary = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const [earningsAgg, completedAgg, pendingAgg, totalOrders, pendingCount, completedCount] = await Promise.all([
            prisma.sellerOrder.aggregate({
                where: { sellerId, status: "DELIVERED" },
                _sum: { sellerEarnings: true }
            }),
            prisma.sellerPayout.aggregate({
                where: { sellerId, status: "COMPLETED" },
                _sum: { amount: true }
            }),
            prisma.sellerPayout.aggregate({
                where: {
                    sellerId,
                    status: { in: ["PENDING", "PROCESSING"] }
                },
                _sum: { amount: true }
            }),
            prisma.sellerOrder.count({ where: { sellerId, status: "DELIVERED" } }),
            prisma.sellerPayout.count({ where: { sellerId, status: { in: ["PENDING", "PROCESSING"] } } }),
            prisma.sellerPayout.count({ where: { sellerId, status: "COMPLETED" } })
        ]);

        const totalEarnings = Number(earningsAgg._sum.sellerEarnings || 0);
        const totalPaid = Number(completedAgg._sum.amount || 0);
        const totalPending = Number(pendingAgg._sum.amount || 0);

        return res.status(200).json({
            totalEarnings,
            totalPaid,
            totalPending,
            deliveredOrdersCount: totalOrders,
            pendingPayoutsCount: pendingCount,
            completedPayoutsCount: completedCount
        });

    } catch (error) {
        console.error("GET EARNINGS SUMMARY ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};