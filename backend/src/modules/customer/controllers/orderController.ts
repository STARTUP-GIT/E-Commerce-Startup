import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { generateInvoicePdf } from "../utils/generateInvoicePdf.js";

export const getOrders = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const orders = await prisma.order.findMany({
            where: {
                customerId
            },
            include: {
                sellerOrders: {
                    include: {
                        items: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error("GET ORDERS ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const getOrder = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const orderId = req.params.orderId as string;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        const order = await prisma.order.findUnique({
            where: {
                id: orderId as string
            },
            include: {
                shippingAddress: true,
                billingAddress: true,
                coupon: true,
                payments: true,
                sellerOrders: {
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        },
                        delivery: true,
                        packingProof: true
                    }
                },
                timelineEvents: {
                    orderBy: {
                        occurredAt: "asc"
                    }
                }
            }
        });

        if (!order || order.customerId !== customerId) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        return res.status(200).json({
            order
        });

    } catch (error) {
        console.error("GET ORDER ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const cancelOrder = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const orderId = req.params.orderId as string;
        const { reason } = req.body;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        const order = await prisma.order.findUnique({
            where: {
                id: orderId as string
            },
            include: {
                sellerOrders: true
            }
        });

        if (!order || order.customerId !== customerId) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (order.status !== "PENDING") {
            return res.status(400).json({
                message: `Order cannot be cancelled in status ${order.status}`
            });
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const cancelTime = new Date();

            const updated = await tx.order.update({
                where: { id: orderId as string },
                data: {
                    status: "CANCELLED",
                    cancelledAt: cancelTime,
                    cancellationReason: reason?.trim() || "Cancelled by customer"
                }
            });

            await tx.sellerOrder.updateMany({
                where: { orderId: orderId as string },
                data: {
                    status: "CANCELLED",
                    rejectionReason: `Cancelled by customer: ${reason?.trim() || "No reason provided"}`
                }
            });

            // Create order timeline event
            await tx.orderTimelineEvent.create({
                data: {
                    entityType: "ORDER",
                    orderId: orderId as string,
                    status: "CANCELLED",
                    title: "Order Cancelled",
                    description: reason?.trim() || "Order was cancelled by the customer."
                }
            });

            // Create seller orders timeline events
            for (const sellerOrder of order.sellerOrders) {
                await tx.orderTimelineEvent.create({
                    data: {
                        entityType: "SELLER_ORDER",
                        sellerOrderId: sellerOrder.id,
                        orderId: orderId as string,
                        status: "CANCELLED",
                        title: "Seller Order Cancelled",
                        description: `Order cancelled by customer. Reason: ${reason?.trim() || "No reason provided"}`
                    }
                });
            }

            return updated;
        });

        return res.status(200).json({
            message: "Order cancelled successfully",
            order: updatedOrder
        });

    } catch (error) {
        console.error("CANCEL ORDER ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const trackOrder = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const orderId = req.params.orderId as string;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        const order = await prisma.order.findUnique({
            where: {
                id: orderId as string
            },
            include: {
                sellerOrders: {
                    include: {
                        delivery: {
                            select: {
                                id: true,
                                status: true,
                                deliveryNumber: true,
                                estimatedDeliveryAt: true,
                                actualDeliveryAt: true,
                                deliveryPartner: {
                                    select: {
                                        currentLat: true,
                                        currentLng: true
                                    }
                                }
                            }
                        }
                    }
                },
                timelineEvents: {
                    orderBy: {
                        occurredAt: "asc"
                    }
                }
            }
        });

        if (!order || order.customerId !== customerId) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        return res.status(200).json({
            status: order.status,
            timeline: order.timelineEvents,
            deliveries: order.sellerOrders.map((so) => ({
                sellerOrderId: so.id,
                status: so.status,
                delivery: so.delivery ? {
                    id: so.delivery.id,
                    status: so.delivery.status,
                    deliveryNumber: so.delivery.deliveryNumber,
                    estimatedDeliveryAt: so.delivery.estimatedDeliveryAt,
                    actualDeliveryAt: so.delivery.actualDeliveryAt,
                    currentLat: so.delivery.deliveryPartner?.currentLat ? Number(so.delivery.deliveryPartner.currentLat) : null,
                    currentLng: so.delivery.deliveryPartner?.currentLng ? Number(so.delivery.deliveryPartner.currentLng) : null
                } : null
            }))
        });

    } catch (error) {
        console.error("TRACK ORDER ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const downloadInvoice = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const orderId = req.params.orderId as string;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required"
            });
        }

        const order = await prisma.order.findUnique({
            where: {
                id: orderId as string
            },
            include: {
                shippingAddress: true,
                billingAddress: true,
                customer: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                    }
                },
                payments: {
                    select: {
                        amount: true,
                        status: true,
                        method: true,
                        gatewayPaymentId: true,
                        invoiceNumber: true,
                        paidAt: true
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1
                },
                sellerOrders: {
                    include: {
                        seller: {
                            select: {
                                firstName: true,
                                lastName: true,
                                phone: true,
                                shop: {
                                    select: {
                                        name: true,
                                        logoUrl: true,
                                        businessName: true,
                                        supportEmail: true,
                                        supportPhone: true
                                    }
                                }
                            }
                        },
                        items: {
                            include: {
                                product: {
                                    select: {
                                        category: {
                                            select: { name: true }
                                        }
                                    }
                                }
                            }
                        },
                        delivery: {
                            select: {
                                deliveryNumber: true,
                                status: true,
                                estimatedDeliveryAt: true,
                                deliveryPartner: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        vehicleType: true,
                                        vehicleNumber: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!order || order.customerId !== customerId) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const doc = generateInvoicePdf(order as any);
        const fileName = `invoice-${order.orderNumber}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

        doc.pipe(res);
        doc.end();

    } catch (error) {
        console.error("DOWNLOAD INVOICE ERROR:", error);
        if (!res.headersSent) {
            return res.status(500).json({
                message: "Internal Server Error"
            });
        }
    }
};

export const confirmDelivery = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const sellerOrderId = req.params.sellerOrderId as string;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!sellerOrderId) {
            return res.status(400).json({
                message: "Seller Order ID is required"
            });
        }

        const sellerOrder = await prisma.sellerOrder.findUnique({
            where: { id: sellerOrderId },
            include: { order: true }
        });

        if (!sellerOrder || sellerOrder.order.customerId !== customerId) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if (sellerOrder.status !== "SHIPPED") {
            return res.status(400).json({
                message: `Order must be in SHIPPED status to confirm delivery. Current status: ${sellerOrder.status}`
            });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.sellerOrder.update({
                where: { id: sellerOrderId },
                data: {
                    status: "DELIVERED",
                    deliveredAt: new Date()
                }
            });

            await tx.orderTimelineEvent.create({
                data: {
                    entityType: "SELLER_ORDER",
                    sellerOrderId,
                    orderId: sellerOrder.orderId,
                    status: "DELIVERED",
                    title: "Delivery Confirmed by Customer",
                    description: "Customer confirmed delivery of items."
                }
            });

            return result;
        });

        return res.status(200).json({
            message: "Delivery confirmed successfully",
            sellerOrder: updated
        });

    } catch (error) {
        console.error("CONFIRM DELIVERY ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};
