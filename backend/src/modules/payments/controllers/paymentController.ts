import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import {
    createPayment as createPaymentService,
    verifyPayment as verifyPaymentService,
    refundPayment as refundPaymentService
} from "../services/payment.service.js";
import { generateInvoice } from "../utils/invoice.js";
import { sendPaymentNotification } from "../utils/paymentHelper.js";

// Seller toggles checkbox to request/enable packing fee
export const togglePackingFee = async (req: Request, res: Response) => {
    try {
        const sellerId = req.sellerId;
        const { enablePackingFee } = req.body;

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (enablePackingFee === undefined) {
            return res.status(400).json({
                message: "enablePackingFee status is required"
            });
        }

        const shop = await prisma.shop.findUnique({
            where: { sellerId }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        const updatedShop = await prisma.shop.update({
            where: { id: shop.id },
            data: {
                enablePackingFee: !!enablePackingFee
            }
        });

        return res.status(200).json({
            message: "Packing fee status updated successfully",
            shop: {
                id: updatedShop.id,
                name: updatedShop.name,
                enablePackingFee: updatedShop.enablePackingFee,
                packingFeeApproved: updatedShop.packingFeeApproved
            }
        });

    } catch (error) {
        console.error("TOGGLE PACKING FEE ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

// Admin approves packing fee permission for a shop
export const approvePackingFee = async (req: Request, res: Response) => {
    try {
        const shopId = req.params.shopId as string;

        if (!shopId) {
            return res.status(400).json({
                message: "Shop ID is required"
            });
        }

        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                packingFeeApproved: true
            }
        });

        return res.status(200).json({
            message: "Packing fee approved by admin",
            shop: {
                id: updatedShop.id,
                name: updatedShop.name,
                enablePackingFee: updatedShop.enablePackingFee,
                packingFeeApproved: updatedShop.packingFeeApproved
            }
        });

    } catch (error) {
        console.error("APPROVE PACKING FEE ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

// Admin revokes packing fee permission
export const revokePackingFee = async (req: Request, res: Response) => {
    try {
        const shopId = req.params.shopId as string;

        if (!shopId) {
            return res.status(400).json({
                message: "Shop ID is required"
            });
        }

        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop) {
            return res.status(404).json({
                message: "Shop not found"
            });
        }

        const updatedShop = await prisma.shop.update({
            where: { id: shopId },
            data: {
                packingFeeApproved: false
            }
        });

        return res.status(200).json({
            message: "Packing fee revoked by admin",
            shop: {
                id: updatedShop.id,
                name: updatedShop.name,
                enablePackingFee: updatedShop.enablePackingFee,
                packingFeeApproved: updatedShop.packingFeeApproved
            }
        });

    } catch (error) {
        console.error("REVOKE PACKING FEE ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const createPayment = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const { shippingAddressId, billingAddressId, couponCode, packingFees } = req.body;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!shippingAddressId) {
            return res.status(400).json({
                message: "shippingAddressId is required"
            });
        }

        const session = await createPaymentService({
            customerId,
            shippingAddressId,
            billingAddressId,
            couponCode,
            packingFees
        });

        return res.status(200).json(session);

    } catch (error: any) {
        console.error("CREATE PAYMENT ERROR:", error);
        return res.status(400).json({
            message: error.message || "Internal Server Error"
        });
    }
};

export const verifyPayment = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const {
            shippingAddressId,
            billingAddressId,
            couponCode,
            packingFees,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            merchantTransactionId
        } = req.body;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const order = await verifyPaymentService({
            customerId,
            shippingAddressId,
            billingAddressId,
            couponCode,
            packingFees,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            merchantTransactionId
        });

        return res.status(200).json({
            message: "Payment verified and order created successfully",
            order
        });

    } catch (error: any) {
        console.error("VERIFY PAYMENT ERROR:", error);
        return res.status(400).json({
            message: error.message || "Internal Server Error"
        });
    }
};

export const refundPayment = async (req: Request, res: Response) => {
    try {
        const { paymentId, amount } = req.body;

        if (!paymentId) {
            return res.status(400).json({
                message: "paymentId is required"
            });
        }

        const refund = await refundPaymentService({
            paymentId,
            amount
        });

        return res.status(200).json({
            message: "Refund processed successfully",
            refund
        });

    } catch (error: any) {
        console.error("REFUND PAYMENT ERROR:", error);
        return res.status(400).json({
            message: error.message || "Internal Server Error"
        });
    }
};

// Retrieve a single payment record with role-based access control
export const getPayment = async (req: Request, res: Response) => {
    try {
        const paymentId = req.params.paymentId as string;
        const { customerId, sellerId } = req;

        if (!paymentId) {
            return res.status(400).json({ message: "Payment ID is required" });
        }

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                order: {
                    include: {
                        sellerOrders: true
                    }
                }
            }
        });

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        // Ownership checks
        if (customerId && payment.customerId !== customerId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (sellerId) {
            const hasItem = payment.order.sellerOrders.some(so => so.sellerId === sellerId);
            if (!hasItem) {
                return res.status(403).json({ message: "Forbidden" });
            }
        }

        return res.status(200).json({ payment });
    } catch (error) {
        console.error("GET PAYMENT ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// Retrieve payment history list
export const getPaymentHistory = async (req: Request, res: Response) => {
    try {
        const { customerId, sellerId } = req;

        let payments = [];
        if (customerId) {
            payments = await prisma.payment.findMany({
                where: { customerId },
                orderBy: { createdAt: "desc" }
            });
        } else if (sellerId) {
            payments = await prisma.payment.findMany({
                where: {
                    order: {
                        sellerOrders: {
                            some: { sellerId }
                        }
                    }
                },
                orderBy: { createdAt: "desc" }
            });
        } else {
            // Admin query
            payments = await prisma.payment.findMany({
                orderBy: { createdAt: "desc" }
            });
        }

        return res.status(200).json({ count: payments.length, payments });
    } catch (error) {
        console.error("GET PAYMENT HISTORY ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getPayments = getPaymentHistory;

// Generate and download invoice representation
export const downloadInvoice = async (req: Request, res: Response) => {
    try {
        const paymentId = req.params.paymentId as string;
        const { customerId, sellerId } = req;

        if (!paymentId) {
            return res.status(400).json({ message: "Payment ID is required" });
        }

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                customer: true,
                order: {
                    include: {
                        sellerOrders: {
                            include: {
                                seller: {
                                    include: {
                                        shop: true
                                    }
                                },
                                items: true
                            }
                        }
                    }
                }
            }
        });

        if (!payment || !payment.invoiceNumber) {
            return res.status(404).json({ message: "Invoice or Payment record not found" });
        }

        // Access check
        if (customerId && payment.customerId !== customerId) {
            return res.status(403).json({ message: "Forbidden" });
        }
        if (sellerId) {
            const hasItem = payment.order.sellerOrders.some(so => so.sellerId === sellerId);
            if (!hasItem) {
                return res.status(403).json({ message: "Forbidden" });
            }
        }

        const sellersSummary = payment.order.sellerOrders.map(so => ({
            sellerId: so.sellerId,
            shopName: so.seller.shop?.name || `${so.seller.firstName} ${so.seller.lastName}`,
            items: so.items.map(item => ({
                name: item.productName,
                sku: item.productSku,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice)
            }))
        }));

        const invoice = generateInvoice({
            invoiceNumber: payment.invoiceNumber,
            customer: {
                id: payment.customer.id,
                username: payment.customer.username,
                firstName: payment.customer.firstName || "",
                lastName: payment.customer.lastName || "",
                email: payment.customer.email
            },
            order: {
                orderNumber: payment.order.orderNumber,
                createdAt: payment.order.createdAt,
                subtotal: Number(payment.order.subtotal),
                shippingTotal: Number(payment.order.shippingTotal),
                packingFeeTotal: Number(payment.order.packingFeeTotal),
                taxTotal: Number(payment.order.taxTotal),
                grandTotal: Number(payment.order.grandTotal)
            },
            sellers: sellersSummary,
            payment: {
                method: payment.method,
                status: payment.status
            }
        });

        return res.status(200).json({ invoice });
    } catch (error) {
        console.error("DOWNLOAD INVOICE ERROR:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const paymentWebhook = async (req: Request, res: Response) => {
    try {
        const signatureHeader = req.headers["x-razorpay-signature"] as string;
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

        const rawBodyStr = (req as any).rawBody 
            ? (req as any).rawBody.toString("utf8") 
            : JSON.stringify(req.body);

        if (secret || process.env.NODE_ENV?.toLowerCase() === "production") {
            if (!signatureHeader || !secret) {
                return res.status(401).json({ message: "Invalid signature" });
            }
            const crypto = await import("crypto");
            const shasum = crypto.createHmac("sha256", secret);
            shasum.update(rawBodyStr);
            const digest = shasum.digest("hex");
            if (digest !== signatureHeader) {
                return res.status(401).json({ message: "Invalid signature" });
            }
        }

        // Deduplication & Idempotency: Ignore duplicate events and replay attacks
        const crypto = await import("crypto");
        const payloadHash = crypto.createHash("sha256").update(rawBodyStr).digest("hex");
        const eventId = req.body.id || `rzp_${Date.now()}`;

        const existingEvent = await prisma.webhookEvent.findFirst({
            where: {
                OR: [
                    { payloadHash },
                    {
                        provider: "RAZORPAY",
                        providerEventId: eventId
                    }
                ]
            }
        });

        if (existingEvent) {
            return res.status(200).json({ message: "Webhook already processed" });
        }

        await prisma.webhookEvent.create({
            data: {
                provider: "RAZORPAY",
                providerEventId: eventId,
                payloadHash,
                processedAt: new Date()
            }
        });

        const { event, payload } = req.body;

        // Duplicate webhook protection is handled within verifyPaymentService via findUnique check
        if (event === "payment.captured" || event === "payment.authorized") {
            const razorpayOrderId = payload.payment.entity.order_id;
            const razorpayPaymentId = payload.payment.entity.id;
            const razorpaySignature = "WEBHOOK_VERIFIED"; // webhook signature verification happens prior

            // Fetch checkout details from metadata or standard webhook body
            const customerId = payload.payment.entity.notes?.customerId;
            const shippingAddressId = payload.payment.entity.notes?.shippingAddressId;
            const couponCode = payload.payment.entity.notes?.couponCode;
            const packingFees = payload.payment.entity.notes?.packingFees 
                ? JSON.parse(payload.payment.entity.notes.packingFees) 
                : [];

            if (customerId && shippingAddressId) {
                await verifyPaymentService({
                    customerId,
                    shippingAddressId,
                    couponCode,
                    packingFees,
                    razorpayOrderId,
                    razorpayPaymentId,
                    razorpaySignature
                });
            }
        } else if (event === "payment.failed") {
            const customerId = payload.payment.entity.notes?.customerId;
            if (customerId) {
                await sendPaymentNotification({
                    recipientId: customerId,
                    recipientType: "CUSTOMER",
                    type: "PAYMENT_FAILED",
                    title: "Payment Failed",
                    body: `Your payment transaction for ${payload.payment.entity.order_id || "order"} failed. Please try again.`
                });
            }
        }

        return res.status(200).json({
            message: "Webhook processed successfully"
        });
    } catch (error: any) {
        // Return 200 status for duplicate webhook / already verified payments to acknowledge reception
        if (error.message && error.message.includes("processed and verified")) {
            return res.status(200).json({ message: "Webhook already processed" });
        }
        console.error("PAYMENT WEBHOOK ERROR:", error);
        return res.status(500).json({
            message: error.message || "Internal Server Error"
        });
    }
};