import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { calculateTotals } from "../../payments/services/payment.service.js";

// Helper to validate cart items and check stock levels
const runCheckoutValidation = async (
    customerId: string,
    buyNow?: { productId: string; productVariantId?: string; quantity: number }
) => {
    try {
        const address = await prisma.customerAddress.findFirst({
            where: { customerId, isDefault: true }
        }) || await prisma.customerAddress.findFirst({
            where: { customerId }
        });

        const totals = await calculateTotals({
            customerId,
            shippingAddressId: address?.id,
            buyNow
        });
        return { isValid: true, cart: totals.cart, totals };
    } catch (error: any) {
        return { isValid: false, message: error.message || "Validation failed" };
    }
};

export const validateCheckout = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const buyNow = req.query.buyNow === "true" ? {
            productId: req.query.productId as string,
            productVariantId: req.query.productVariantId as string || undefined,
            quantity: parseInt(req.query.quantity as string) || 1
        } : undefined;

        const validation = await runCheckoutValidation(customerId, buyNow);

        if (!validation.isValid) {
            return res.status(400).json({
                isValid: false,
                message: validation.message
            });
        }

        return res.status(200).json({
            isValid: true,
            message: "Checkout is valid"
        });

    } catch (error) {
        console.error("VALIDATE CHECKOUT ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const calculateShipping = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const buyNow = req.body.buyNow;
        const validation = await runCheckoutValidation(customerId, buyNow);
        if (!validation.isValid || !validation.totals) {
            return res.status(400).json({
                message: validation.message
            });
        }

        return res.status(200).json({
            shippingTotal: validation.totals.shippingTotal
        });

    } catch (error) {
        console.error("CALCULATE SHIPPING ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const calculateTaxes = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const buyNow = req.body.buyNow;
        const validation = await runCheckoutValidation(customerId, buyNow);
        if (!validation.isValid || !validation.totals) {
            return res.status(400).json({
                message: validation.message
            });
        }

        return res.status(200).json({
            taxTotal: validation.totals.gstAmount
        });

    } catch (error) {
        console.error("CALCULATE TAXES ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const applyCoupon = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const { couponCode, buyNow } = req.body;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!couponCode?.trim()) {
            return res.status(400).json({
                message: "Coupon code is required"
            });
        }

        const address = await prisma.customerAddress.findFirst({
            where: { customerId, isDefault: true }
        }) || await prisma.customerAddress.findFirst({
            where: { customerId }
        });

        const totals = await calculateTotals({
            customerId,
            couponCode: couponCode.trim(),
            shippingAddressId: address?.id,
            buyNow
        });

        if (!totals.appliedCoupon) {
            return res.status(400).json({
                message: "Coupon is invalid or inactive"
            });
        }

        return res.status(200).json({
            message: "Coupon applied successfully",
            coupon: totals.appliedCoupon,
            discount: totals.discountTotal
        });

    } catch (error: any) {
        console.error("APPLY COUPON ERROR:", error);
        return res.status(400).json({
            message: error.message || "Internal Server Error"
        });
    }
};

export const removeCoupon = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        return res.status(200).json({
            message: "Coupon removed successfully"
        });

    } catch (error) {
        console.error("REMOVE COUPON ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};

export const checkout = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const { couponCode, buyNow, selectedDeliveryMethod } = req.body;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const address = await prisma.customerAddress.findFirst({
            where: { customerId, isDefault: true }
        }) || await prisma.customerAddress.findFirst({
            where: { customerId }
        });

        const totals = await calculateTotals({
            customerId,
            couponCode,
            shippingAddressId: address?.id,
            buyNow,
            selectedDeliveryMethod
        });

        const itemsSummary = totals.cart.items.map((item: any) => {
            const price = item.productVariant ? Number(item.productVariant.price) : Number(item.product.price);
            return {
                productId: item.productId,
                productVariantId: item.productVariantId || null,
                name: item.product.name,
                variantName: item.productVariant?.name || null,
                quantity: item.quantity,
                unitPrice: price,
                totalPrice: price * item.quantity
            };
        });

        return res.status(200).json({
            checkoutSummary: {
                items: itemsSummary,
                subtotal: totals.productSubtotal,
                shippingTotal: totals.shippingTotal,
                packingFeeTotal: totals.packingFeeTotal,
                platformFeeTotal: totals.platformFeeTotal,
                discountTotal: totals.discountTotal,
                taxTotal: totals.gstAmount,
                grandTotal: totals.grandTotal,
                appliedCoupon: totals.appliedCoupon
                    ? {
                          id: totals.appliedCoupon.id,
                          code: totals.appliedCoupon.code,
                          discountType: totals.appliedCoupon.discountType,
                          discountValue: Number(totals.appliedCoupon.discountValue)
                      }
                    : null
            }
        });

    } catch (error: any) {
        console.error("CHECKOUT ERROR:", error);
        return res.status(400).json({
            message: error.message || "Internal Server Error"
        });
    }
};

export const getEnabledPaymentMethods = async (req: Request, res: Response) => {
    try {
        const { ensureDefaultPaymentMethods } = await import("../../admin/controllers/paymentMethodController.js");
        await ensureDefaultPaymentMethods();
        const methods = await prisma.paymentMethodSetting.findMany({
            where: { enabled: true },
            orderBy: { displayOrder: "asc" }
        });
        return res.status(200).json({ paymentMethods: methods });
    } catch (error: any) {
        console.error("GET ENABLED PAYMENT METHODS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const getEnabledDeliveryMethods = async (req: Request, res: Response) => {
    try {
        const { ensureDefaultDeliveryMethods } = await import("../../admin/controllers/deliveryMethodController.js");
        await ensureDefaultDeliveryMethods();
        const methods = await prisma.deliveryMethodSetting.findMany({
            where: { enabled: true },
            orderBy: { displayOrder: "asc" }
        });
        return res.status(200).json({ deliveryMethods: methods });
    } catch (error: any) {
        console.error("GET ENABLED DELIVERY METHODS ERROR:", error);
        return res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

export const checkoutCod = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        const { shippingAddressId, billingAddressId, couponCode, packingFees, buyNow, selectedDeliveryMethod } = req.body;

        if (!customerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!shippingAddressId) {
            return res.status(400).json({ message: "shippingAddressId is required" });
        }

        const { processCodPayment } = await import("../../payments/services/payment.service.js");

        const order = await processCodPayment({
            customerId,
            shippingAddressId,
            billingAddressId,
            couponCode,
            packingFees,
            buyNow,
            selectedDeliveryMethod
        });

        return res.status(200).json({
            message: "COD Order created successfully",
            order
        });
    } catch (error: any) {
        console.error("CHECKOUT COD ERROR:", error);
        return res.status(400).json({
            message: error.message || "Internal Server Error"
        });
    }
};
