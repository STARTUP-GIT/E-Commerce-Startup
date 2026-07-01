import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";

export const getPayments = async (req: Request, res: Response) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const whereClause: any = {};
        if (status) whereClause.status = String(status);

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [payments, total] = await prisma.$transaction([
            prisma.payment.findMany({
                where: whereClause,
                include: {
                    customer: { select: { id: true, username: true, email: true } },
                    order: true
                },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.payment.count({ where: whereClause })
        ]);

        return res.status(200).json({
            payments,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (error: any) {
        console.error("GET PAYMENTS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getPayment = async (req: Request, res: Response) => {
    try {
        const paymentId = String(req.params.id);
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                customer: { select: { id: true, username: true, email: true } },
                order: { include: { sellerOrders: { include: { seller: { include: { shop: true } } } } } }
            }
        });

        if (!payment) return res.status(404).json({ message: "Payment not found" });
        return res.status(200).json({ payment });
    } catch (error: any) {
        console.error("GET PAYMENT DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getRefunds = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [refunds, total] = await prisma.$transaction([
            prisma.payment.findMany({
                where: { status: { in: ["REFUND_PENDING", "REFUNDED"] } },
                include: {
                    customer: { select: { id: true, username: true, email: true } },
                    order: true
                },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.payment.count({ where: { status: { in: ["REFUND_PENDING", "REFUNDED"] } } })
        ]);

        return res.status(200).json({
            refunds,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (error: any) {
        console.error("GET REFUNDS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const approveRefund = async (req: Request, res: Response) => {
    try {
        const paymentId = String(req.params.id);
        const adminId = req.adminId!;

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: { order: true }
        });

        if (!payment) return res.status(404).json({ message: "Payment not found" });
        if (payment.status !== "REFUND_PENDING") {
            return res.status(400).json({ message: "Payment is not in REFUND_PENDING state" });
        }

        await prisma.$transaction([
            prisma.payment.update({
                where: { id: paymentId },
                data: { status: "REFUNDED", refundedAt: new Date() }
            }),
            prisma.order.update({
                where: { id: payment.orderId },
                data: { status: "REFUNDED" }
            })
        ]);

        await logAdminAction({
            adminId,
            actionType: AdminActionType.RETURN_APPROVED,
            targetType: "Payment",
            targetId: paymentId,
            description: `Refund approved for payment ${payment.gatewayOrderId || paymentId}`,
            previousValue: { status: payment.status },
            newValue: { status: "REFUNDED" }
        });

        return res.status(200).json({ message: "Refund approved successfully" });
    } catch (error: any) {
        console.error("APPROVE REFUND ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const rejectRefund = async (req: Request, res: Response) => {
    try {
        const paymentId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body;

        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

        if (!payment) return res.status(404).json({ message: "Payment not found" });
        if (payment.status !== "REFUND_PENDING") {
            return res.status(400).json({ message: "Payment is not in REFUND_PENDING state" });
        }

        await prisma.payment.update({
            where: { id: paymentId },
            data: { status: "COMPLETED", failureReason: reason || "Refund rejected by admin" }
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.RETURN_REJECTED,
            targetType: "Payment",
            targetId: paymentId,
            description: `Refund rejected for payment ${paymentId}. Reason: ${reason}`,
            previousValue: { status: payment.status },
            newValue: { status: "COMPLETED" }
        });

        return res.status(200).json({ message: "Refund rejected successfully" });
    } catch (error: any) {
        console.error("REJECT REFUND ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getPlatformRevenue = async (req: Request, res: Response) => {
    try {
        const [totalRevenue, todayRevenue, monthlyRevenue] = await Promise.all([
            prisma.payment.aggregate({
                where: { status: "COMPLETED" },
                _sum: { amount: true }
            }),
            prisma.payment.aggregate({
                where: {
                    status: "COMPLETED",
                    createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                },
                _sum: { amount: true }
            }),
            prisma.payment.aggregate({
                where: {
                    status: "COMPLETED",
                    createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                },
                _sum: { amount: true }
            })
        ]);

        return res.status(200).json({
            totalRevenue: Number(totalRevenue._sum?.amount ?? 0),
            todayRevenue: Number(todayRevenue._sum?.amount ?? 0),
            monthlyRevenue: Number(monthlyRevenue._sum?.amount ?? 0)
        });
    } catch (error: any) {
        console.error("GET PLATFORM REVENUE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getSellerCommissionHistory = async (req: Request, res: Response) => {
    try {
        const { sellerId, page = 1, limit = 10 } = req.query;

        const whereClause: any = { status: "DELIVERED" };
        if (sellerId) whereClause.sellerId = String(sellerId);

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [sellerOrders, total] = await prisma.$transaction([
            prisma.sellerOrder.findMany({
                where: whereClause,
                include: {
                    seller: { include: { shop: true } },
                    order: { select: { orderNumber: true, createdAt: true } }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.sellerOrder.count({ where: whereClause })
        ]);

        return res.status(200).json({
            commissions: sellerOrders.map(so => ({
                sellerOrderId: so.id,
                sellerId: so.sellerId,
                shopName: so.seller?.shop?.name,
                orderNumber: so.order?.orderNumber,
                sellerEarnings: Number(so.sellerEarnings ?? 0),
                packingFee: Number(so.packingFee ?? 0),
                subtotal: Number(so.subtotal),
                createdAt: so.createdAt
            })),
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (error: any) {
        console.error("GET SELLER COMMISSION HISTORY ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
