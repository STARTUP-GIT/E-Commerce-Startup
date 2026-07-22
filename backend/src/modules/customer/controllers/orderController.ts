import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import PDFDocument from "pdfkit";

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
                        email: true
                    }
                },
                sellerOrders: {
                    include: {
                        seller: {
                            select: {
                                firstName: true,
                                lastName: true,
                                shop: true
                            }
                        },
                        items: true
                    }
                }
            }
        });

        if (!order || order.customerId !== customerId) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const fileName = `invoice-${order.orderNumber}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text("INVOICE", { align: "center" });
        doc.moveDown();
        doc.fontSize(10).text(`Invoice #: ${order.orderNumber}`);
        doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
        doc.text(`Status: ${order.status}`);
        doc.moveDown();

        // Customer info
        doc.fontSize(12).text("Bill To:");
        doc.fontSize(10);
        const customerName = `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim();
        if (customerName) doc.text(customerName);
        if (order.customer.email) doc.text(order.customer.email);
        const billing = order.billingAddress || order.shippingAddress;
        if (billing) {
            if (billing.addressLine1) doc.text(billing.addressLine1);
            if (billing.city || billing.state || billing.postalCode) {
                doc.text(`${billing.city || ""}, ${billing.state || ""} ${billing.postalCode || ""}`.trim());
            }
            if (billing.country) doc.text(billing.country);
        }
        doc.moveDown();

        // Items table per vendor
        for (const so of order.sellerOrders) {
            const vendorName = so.seller.shop?.name || `${so.seller.firstName} ${so.seller.lastName}`;
            doc.fontSize(11).text(`Vendor: ${vendorName}`);
            doc.fontSize(9);

            const tableTop = doc.y;
            const colName = 50;
            const colSku = 250;
            const colQty = 330;
            const colPrice = 380;
            const colTotal = 440;

            doc.text("Item", colName, tableTop, { width: 200 });
            doc.text("SKU", colSku, tableTop, { width: 80 });
            doc.text("Qty", colQty, tableTop, { width: 50 });
            doc.text("Price", colPrice, tableTop, { width: 60 });
            doc.text("Total", colTotal, tableTop, { width: 60 });

            doc.moveTo(colName, tableTop + 12).lineTo(510, tableTop + 12).stroke();

            let y = tableTop + 18;
            for (const item of so.items) {
                doc.text(item.productName, colName, y, { width: 200 });
                doc.text(item.productSku, colSku, y, { width: 80 });
                doc.text(String(item.quantity), colQty, y, { width: 50 });
                doc.text(`₹${Number(item.unitPrice).toFixed(2)}`, colPrice, y, { width: 60 });
                doc.text(`₹${Number(item.totalPrice).toFixed(2)}`, colTotal, y, { width: 60 });
                y += 14;
            }

            doc.moveTo(colName, y).lineTo(510, y).stroke();
            y += 6;
            doc.text(`Subtotal: ₹${Number(so.subtotal).toFixed(2)}`, colName, y);
            y += 12;
            doc.text(`Shipping: ₹${Number(so.shippingAmount).toFixed(2)}`, colName, y);
            y += 12;
            doc.text(`Tax: ₹${Number(so.taxAmount).toFixed(2)}`, colName, y);
            doc.moveDown(2);
        }

        // Totals
        doc.fontSize(11);
        doc.text(`Subtotal: ₹${Number(order.subtotal).toFixed(2)}`, { align: "right" });
        doc.text(`Shipping: ₹${Number(order.shippingTotal).toFixed(2)}`, { align: "right" });
        if (Number(order.discountTotal) > 0) {
            doc.text(`Discount: -₹${Number(order.discountTotal).toFixed(2)}`, { align: "right" });
        }
        doc.text(`Tax: ₹${Number(order.taxTotal).toFixed(2)}`, { align: "right" });
        doc.fontSize(13).text(`Grand Total: ₹${Number(order.grandTotal).toFixed(2)}`, { align: "right" });

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
