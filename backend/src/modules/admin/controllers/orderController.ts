import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { logAdminAction } from "../utils/actionLogger.js";
import { AdminActionType } from "@prisma/client";

export const getOrders = async (req: Request, res: Response) => {
    try {
        const {
            status,
            customerId,
            paymentMethod,
            deliveryMethod,
            search,
            state,
            district,
            unassigned,
            dateFrom,
            dateTo,
            page = 1,
            limit = 10
        } = req.query;

        const andConditions: any[] = [];

        if (status && String(status).toUpperCase() !== "ALL") {
            andConditions.push({ status: String(status) as any });
        }
        if (customerId) {
            andConditions.push({ customerId: String(customerId) });
        }
        if (paymentMethod && String(paymentMethod).toUpperCase() !== "ALL") {
            andConditions.push({ paymentMethod: String(paymentMethod) });
        }
        if (deliveryMethod && String(deliveryMethod).toUpperCase() !== "ALL") {
            andConditions.push({ selectedDeliveryMethod: String(deliveryMethod) });
        }

        if (search) {
            const searchStr = String(search).trim();
            andConditions.push({
                OR: [
                    { orderNumber: { contains: searchStr, mode: "insensitive" } },
                    { customer: { username: { contains: searchStr, mode: "insensitive" } } },
                    { customer: { email: { contains: searchStr, mode: "insensitive" } } },
                    { customer: { phone: { contains: searchStr, mode: "insensitive" } } },
                    { shippingAddress: { fullName: { contains: searchStr, mode: "insensitive" } } }
                ]
            });
        }

        const isUnassigned = unassigned === "true" || state === "UNASSIGNED";
        const stateStr = typeof state === "string" ? state.trim() : "";
        const districtStr = typeof district === "string" ? district.trim() : "";

        if (isUnassigned) {
            andConditions.push({
                shippingAddress: {
                    state: { equals: "" }
                }
            });
        } else if (stateStr || districtStr) {
            const addrCond: any = {};
            if (stateStr) {
                addrCond.state = { equals: stateStr, mode: "insensitive" };
            }
            if (districtStr) {
                addrCond.district = { equals: districtStr, mode: "insensitive" };
            }
            andConditions.push({
                OR: [
                    { shippingAddress: addrCond },
                    ...(stateStr ? [{ placeOfSupplyState: { equals: stateStr, mode: "insensitive" } }] : [])
                ]
            });
        }

        if (dateFrom) {
            const parsedFrom = new Date(String(dateFrom));
            if (!isNaN(parsedFrom.getTime())) {
                andConditions.push({ createdAt: { gte: parsedFrom } });
            }
        }
        if (dateTo) {
            const parsedTo = new Date(String(dateTo));
            if (!isNaN(parsedTo.getTime())) {
                andConditions.push({ createdAt: { lte: parsedTo } });
            }
        }

        const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [orders, total] = await prisma.$transaction([
            prisma.order.findMany({
                where: whereClause,
                include: {
                    customer: { select: { id: true, username: true, email: true } },
                    shippingAddress: { select: { state: true, district: true, city: true } },
                    sellerOrders: { include: { seller: { include: { shop: true } } } }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.order.count({ where: whereClause })
        ]);

        return res.status(200).json({
            orders,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (error: any) {
        console.error("GET ORDERS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getOrder = async (req: Request, res: Response) => {
    try {
        const orderId = String(req.params.id);

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                customer: true,
                shippingAddress: true,
                billingAddress: true,
                coupon: true,
                packagingSnapshots: true,
                sellerOrders: {
                    include: { seller: { include: { shop: true } }, items: true, packagingSnapshots: true }
                },
                payments: true,
                timelineEvents: { orderBy: { createdAt: "asc" } }
            }
        });

        if (!order) return res.status(404).json({ message: "Order not found" });

        return res.status(200).json({ order });
    } catch (error: any) {
        console.error("GET ORDER DETAIL ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getSellerOrders = async (req: Request, res: Response) => {
    try {
        const { status, sellerId, page = 1, limit = 10 } = req.query;

        const whereClause: any = {};
        if (status) whereClause.status = String(status);
        if (sellerId) whereClause.sellerId = String(sellerId);

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        const [sellerOrders, total] = await prisma.$transaction([
            prisma.sellerOrder.findMany({
                where: whereClause,
                include: {
                    order: { include: { customer: { select: { id: true, username: true, email: true } } } },
                    seller: { include: { shop: true } },
                    items: true
                },
                orderBy: { createdAt: "desc" },
                skip,
                take
            }),
            prisma.sellerOrder.count({ where: whereClause })
        ]);

        return res.status(200).json({
            sellerOrders,
            pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
        });
    } catch (error: any) {
        console.error("GET SELLER ORDERS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const orderId = String(req.params.id);
        const { status } = req.body;

        if (!status) return res.status(400).json({ message: "Status is required" });

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return res.status(404).json({ message: "Order not found" });

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { status },
            include: { sellerOrders: true }
        });

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "ORDER",
                orderId,
                status,
                title: "Order Status Updated",
                description: `Admin updated order status to ${status}.`
            }
        });

        return res.status(200).json({ message: "Order status updated successfully", order: updatedOrder });
    } catch (error: any) {
        console.error("UPDATE ORDER STATUS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const cancelOrder = async (req: Request, res: Response) => {
    try {
        const orderId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason } = req.body;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { sellerOrders: { include: { items: true } } }
        });

        if (!order) return res.status(404).json({ message: "Order not found" });
        if (order.status === "CANCELLED") return res.status(400).json({ message: "Order is already cancelled" });
        if (order.status === "DELIVERED") return res.status(400).json({ message: "Cannot cancel a delivered order" });

        await prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: orderId },
                data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason || "Cancelled by Admin" }
            });

            await tx.sellerOrder.updateMany({
                where: { orderId },
                data: { status: "CANCELLED", rejectionReason: `Cancelled by Admin: ${reason || "No reason provided"}` }
            });

            // Restore stock
            for (const so of order.sellerOrders) {
                for (const item of so.items) {
                    if (item.productVariantId) {
                        await tx.productVariant.update({
                            where: { id: item.productVariantId },
                            data: { stockQuantity: { increment: item.quantity } }
                        });
                    } else {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: { stockQuantity: { increment: item.quantity } }
                        });
                    }
                }
                await tx.orderTimelineEvent.create({
                    data: {
                        entityType: "SELLER_ORDER",
                        sellerOrderId: so.id,
                        orderId,
                        status: "CANCELLED",
                        title: "Seller Order Cancelled",
                        description: `Cancelled by Admin. Reason: ${reason || "No reason provided"}`
                    }
                });
            }

            await tx.orderTimelineEvent.create({
                data: {
                    entityType: "ORDER",
                    orderId,
                    status: "CANCELLED",
                    title: "Order Cancelled",
                    description: reason || "Order cancelled by Admin."
                }
            });
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.RETURN_REJECTED,
            targetType: "Order",
            targetId: orderId,
            description: `Order ${order.orderNumber} cancelled by admin. Reason: ${reason}`,
            previousValue: { status: order.status },
            newValue: { status: "CANCELLED" }
        });

        return res.status(200).json({ message: "Order cancelled successfully and stock restored" });
    } catch (error: any) {
        console.error("ADMIN CANCEL ORDER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const refundOrder = async (req: Request, res: Response) => {
    try {
        const orderId = String(req.params.id);
        const adminId = req.adminId!;
        const { reason, amount } = req.body;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { payments: true }
        });

        if (!order) return res.status(404).json({ message: "Order not found" });

        const completedPayment = order.payments.find(p => p.status === "COMPLETED");
        if (!completedPayment) return res.status(400).json({ message: "No completed payment found for this order" });

        const refundAmt = amount ? Number(amount) : Number(completedPayment.amount);

        await prisma.$transaction(async (tx) => {
            await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
            await tx.payment.update({
                where: { id: completedPayment.id },
                data: { status: "REFUNDED", refundAmount: refundAmt, refundedAt: new Date(), failureReason: reason || "Refunded by Admin" }
            });
            await tx.orderTimelineEvent.create({
                data: {
                    entityType: "ORDER",
                    orderId,
                    status: "REFUNDED",
                    title: "Order Refunded",
                    description: `Admin processed refund of INR ${refundAmt}. Reason: ${reason || "No reason provided"}`
                }
            });
        });

        await logAdminAction({
            adminId,
            actionType: AdminActionType.RETURN_APPROVED,
            targetType: "Order",
            targetId: orderId,
            description: `Refund processed for Order ${order.orderNumber}. Amount: ${refundAmt}`,
            previousValue: { status: order.status },
            newValue: { status: "REFUNDED" }
        });

        return res.status(200).json({ message: "Order refunded successfully" });
    } catch (error: any) {
        console.error("ADMIN REFUND ORDER ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getOrderTimeline = async (req: Request, res: Response) => {
    try {
        const orderId = String(req.params.id);
        const timeline = await prisma.orderTimelineEvent.findMany({
            where: { orderId },
            orderBy: { createdAt: "asc" }
        });
        return res.status(200).json({ timeline });
    } catch (error: any) {
        console.error("GET ORDER TIMELINE ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};
