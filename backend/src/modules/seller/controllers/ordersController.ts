import type { Request , Response } from "express"
import { prisma } from "../../../config/prisma.js";
import { getObjectUrl, isValidS3Key, headObjectExists } from '../../../config/storage.js';
import { SellerStatus } from "@prisma/client";
import { SellerOrderStatus } from "@prisma/client";


                    

export const getOrders = async ( req: Request,res: Response) => {

    try {
        const sellerId = req.sellerId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const shop = await prisma.shop.findUnique({
            where: {
                sellerId
            }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop does not exist"
            });
        }

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
                },
                packingProof: true,
                delivery: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        const mappedOrders = orders.map(o => ({
            ...o,
            totalPrice: Number(o.subtotal) + Number(o.shippingAmount) + Number(o.taxAmount) + Number(o.packingFee)
        }));

        return res.status(200).json({
            count: mappedOrders.length,
            orders: mappedOrders
        });

    } catch (error) {

        console.error(
            "GET ORDERS ERROR:",
            error
        );

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const seeOrders = async (
    req: Request,
    res: Response
) => {
    try {

        const sellerId = req.sellerId;
        const sellerOrderId = req.params.orderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!sellerOrderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        const order = await prisma.sellerOrder.findFirst({
            where: {
                id: sellerOrderId as string,
                sellerId
            },
            include: {
                order: true,

                items: {
                    include: {
                        product: true
                    }
                },

                packingProof: true,

                delivery: true,

                pickupSellerAddress: true,

                timelineEvents: {
                    orderBy: {
                        createdAt: "asc"
                    }
                }
            }
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const mappedOrder = {
            ...order,
            totalPrice: Number(order.subtotal) + Number(order.shippingAmount) + Number(order.taxAmount) + Number(order.packingFee)
        };

        return res.status(200).json({
            order: mappedOrder
        });

    } catch (error) {

        console.error(
            "SEE ORDER ERROR:",
            error
        );

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const acceptOrders = async (
    req: Request,
    res: Response
) => {
    try {

        const sellerId = req.sellerId;
        const orderId = req.params.orderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        const order = await prisma.sellerOrder.findFirst({
            where: {
                id: orderId as string,
                sellerId
            }
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (order.status !== "PENDING") {
            return res.status(400).json({
                message: "Order has already been processed"
            });
        }

        const updatedOrder = await prisma.sellerOrder.update({
            where: {
                id: orderId as string
            },
            data: {
                status: "PROCESSING" ,
                acceptedAt: new Date()
            }
        });

        return res.status(200).json({
            message: "Order accepted successfully",
            order: updatedOrder
        });

    } catch (error) {

        console.error(
            "ACCEPT ORDER ERROR:",
            error
        );

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const rejectOrders = async (
    req: Request,
    res: Response
) => {
    try {

        const sellerId = req.sellerId;
        const orderId = req.params.orderId;
        const { reason } = req.body;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        if (!reason?.trim()) {
            return res.status(400).json({
                message: "Rejection reason is required"
            });
        }

        const order = await prisma.sellerOrder.findFirst({
            where: {
                id: orderId as string,
                sellerId
            }
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (order.status !== "PENDING") {
            return res.status(400).json({
                message: "Order has already been processed"
            });
        }

        const updatedOrder = await prisma.sellerOrder.update({
            where: {
                id: orderId as string
            },
            data: {
                status: "CANCELLED",
                rejectedAt: new Date(),
                rejectionReason: reason.trim()
            }
        });

        return res.status(200).json({
            message: "Order rejected successfully",
            order: updatedOrder
        });

    } catch (error) {

        console.error(
            "REJECT ORDER ERROR:",
            error
        );

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};


export const setReadyTime = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const orderId = req.params.orderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        const { readyByAt } = req.body;
        if (!readyByAt) {
            return res.status(400).json({
                message: "Ready by time is required"
            });
        }

        const readyDate = new Date(readyByAt);
        if (isNaN(readyDate.getTime()) || readyDate <= new Date()) {
            return res.status(400).json({
                message: "Ready by time must be a valid future date"
            });
        }

        const order = await prisma.sellerOrder.findFirst({
            where: {
                id: orderId as string,
                sellerId
            }
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const updatedOrder = await prisma.sellerOrder.update({
            where: {
                id: orderId as string
            },
            data: {
                readyByAt: readyDate
            }
        });

        return res.status(200).json({
            message: "Ready by time updated successfully",
            order: updatedOrder
        });

    } catch (error) {
        console.error("SET READY TIME ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const uploadPackingProof = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const orderId = req.params.orderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        const { imageUrls, notes } = req.body;

        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return res.status(400).json({
                message: "Packing proof image URLs must be a non-empty array"
            });
        }

        // Normalize image URLs/keys to S3 object URLs when possible
        const normalized: string[] = [];
        for (const v of imageUrls) {
            if (!v) {
                normalized.push(v);
                continue;
            }
            if (isValidS3Key(v)) {
                // if key reference, ensure object exists
                const exists = await headObjectExists(v);
                if (!exists) return res.status(400).json({ message: `S3 object not found for ${v}` });
                if (v.startsWith('uploads/')) normalized.push(getObjectUrl(v));
                else normalized.push(v);
                continue;
            }
            // allow external URLs as-is
            normalized.push(v);
        }

        const order = await prisma.sellerOrder.findFirst({
            where: {
                id: orderId as string,
                sellerId
            }
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const existingProof = await prisma.packingProof.findUnique({
            where: {
                sellerOrderId: orderId as string
            }
        });

        let proof;
        if (existingProof) {
            proof = await prisma.packingProof.update({
                where: {
                    sellerOrderId: orderId as string
                },
                data: {
                    imageUrls,
                    notes: notes?.trim() || null,
                    packedAt: new Date()
                }
            });
        } else {
            proof = await prisma.packingProof.create({
                data: {
                    sellerOrderId: orderId as string,
                    sellerId,
                    imageUrls: normalized,
                    notes: notes?.trim() || null,
                    packedAt: new Date()
                }
            });
        }

        return res.status(200).json({
            message: "Packing proof uploaded successfully",
            packingProof: proof
        });

    } catch (error) {
        console.error("UPLOAD PACKING PROOF ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const markPacked = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const orderId = req.params.orderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        const order = await prisma.sellerOrder.findFirst({
            where: {
                id: orderId as string,
                sellerId
            }
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (order.status !== "PROCESSING" && order.status !== "ACCEPTED") {
            return res.status(400).json({
                message: "Order status must be ACCEPTED or PROCESSING to mark as packed"
            });
        }

        const proof = await prisma.packingProof.findUnique({
            where: {
                sellerOrderId: orderId as string
            }
        });

        if (!proof) {
            return res.status(400).json({
                message: "Please upload packing proof before marking as packed"
            });
        }

        const updatedOrder = await prisma.sellerOrder.update({
            where: {
                id: orderId as string
            },
            data: {
                status: "PACKED",
                packedAt: new Date()
            }
        });

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "SELLER_ORDER",
                sellerOrderId: orderId as string,
                orderId: order.orderId,
                status: "PACKED",
                title: "Order Packed",
                description: "Seller has packed the items and verified the packing proof."
            }
        });

        return res.status(200).json({
            message: "Order marked as packed successfully",
            order: updatedOrder
        });

    } catch (error) {
        console.error("MARK PACKED ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const markShipped = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const orderId = req.params.orderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        const order = await prisma.sellerOrder.findFirst({
            where: {
                id: orderId as string,
                sellerId
            }
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const allowedStatuses: string[] = ["PACKED", "READY_TO_SHIP", "READY_FOR_PICKUP", "PROCESSING"];
        if (!allowedStatuses.includes(order.status)) {
            return res.status(400).json({
                message: "Order status must be PACKED or READY_TO_SHIP to mark as shipped"
            });
        }

        const updatedOrder = await prisma.sellerOrder.update({
            where: {
                id: orderId as string
            },
            data: {
                status: "SHIPPED",
                shippedAt: new Date()
            }
        });

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "SELLER_ORDER",
                sellerOrderId: orderId as string,
                orderId: order.orderId,
                status: "SHIPPED",
                title: "Order Shipped",
                description: "Order has been shipped and is in transit."
            }
        });

        return res.status(200).json({
            message: "Order marked as shipped successfully",
            order: updatedOrder
        });

    } catch (error) {
        console.error("MARK SHIPPED ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const markDelivered = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const orderId = req.params.orderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        const order = await prisma.sellerOrder.findFirst({
            where: {
                id: orderId as string,
                sellerId
            }
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (order.status !== "SHIPPED") {
            return res.status(400).json({
                message: "Order must be in SHIPPED status to mark as delivered"
            });
        }

        const updatedOrder = await prisma.sellerOrder.update({
            where: {
                id: orderId as string
            },
            data: {
                status: "DELIVERED",
                deliveredAt: new Date()
            }
        });

        await prisma.orderTimelineEvent.create({
            data: {
                entityType: "SELLER_ORDER",
                sellerOrderId: orderId as string,
                orderId: order.orderId,
                status: "DELIVERED",
                title: "Order Delivered",
                description: "Order has been successfully delivered to the customer."
            }
        });

        return res.status(200).json({
            message: "Order marked as delivered successfully",
            order: updatedOrder
        });

    } catch (error) {
        console.error("MARK DELIVERED ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getOrderTimeline = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const orderId = req.params.orderId;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        const order = await prisma.sellerOrder.findFirst({
            where: {
                id: orderId as string,
                sellerId
            }
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const timeline = await prisma.orderTimelineEvent.findMany({
            where: {
                sellerOrderId: orderId as string
            },
            orderBy: {
                occurredAt: "asc"
            }
        });

        return res.status(200).json({
            count: timeline.length,
            timeline
        });

    } catch (error) {
        console.error("GET ORDER TIMELINE ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const markCodCollected = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const orderId = req.params.orderId;

        if (!sellerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!orderId) {
            return res.status(400).json({ message: "Order ID is required" });
        }

        const sellerOrder = await prisma.sellerOrder.findFirst({
            where: { id: orderId as string, sellerId },
            include: { order: { include: { payments: true } } }
        });

        if (!sellerOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (sellerOrder.status !== "DELIVERED") {
            return res.status(400).json({ message: "Order must be in DELIVERED status to mark COD as collected" });
        }

        // Update Payment record for this order
        const payment = await prisma.payment.findFirst({
            where: { orderId: sellerOrder.orderId }
        });

        if (payment) {
            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    status: "PAID",
                    paidAt: new Date()
                }
            });
        }

        return res.status(200).json({
            message: "COD payment marked as collected successfully",
            paymentStatus: "PAID"
        });
    } catch (error) {
        console.error("MARK COD COLLECTED ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


