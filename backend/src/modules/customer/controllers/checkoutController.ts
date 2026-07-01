import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";

// Helper to validate cart items and check stock levels
const runCheckoutValidation = async (customerId: string) => {
    const cart = await prisma.cart.findUnique({
        where: { customerId },
        include: {
            items: {
                include: {
                    product: {
                        include: {
                            seller: {
                                include: {
                                    shop: true,
                                    addresses: true
                                }
                            }
                        }
                    },
                    productVariant: true
                }
            }
        }
    });

    if (!cart || cart.items.length === 0) {
        return { isValid: false, message: "Cart is empty" };
    }

    const address = await prisma.customerAddress.findFirst({
        where: { customerId, isDefault: true }
    }) || await prisma.customerAddress.findFirst({
        where: { customerId }
    });

    let shippingCity = "";
    if (address) {
        shippingCity = address.city.trim().toLowerCase();
        // Verify customer shipping city is active
        const activeCity = await prisma.city.findFirst({
            where: { name: { equals: address.city.trim(), mode: "insensitive" }, isActive: true }
        });
        if (!activeCity) {
            return { isValid: false, message: `We do not operate in your shipping city: ${address.city}` };
        }
    }

    for (const item of cart.items) {
        if (item.product.isDeleted || item.product.status !== "ACTIVE") {
            return { isValid: false, message: `Product '${item.product.name}' is no longer active or available.` };
        }

        const seller = item.product.seller;
        if (!seller.shop || !seller.shop.isActive) {
            return { isValid: false, message: `Shop of product '${item.product.name}' is inactive.` };
        }

        const shopAddress = seller.addresses?.[0];
        if (!shopAddress) {
            return { isValid: false, message: `Seller shop address not found for product '${item.product.name}'` };
        }
        const shopCity = shopAddress.city.trim().toLowerCase();

        // Verify shop city is active
        const activeShopCity = await prisma.city.findFirst({
            where: { name: { equals: shopAddress.city.trim(), mode: "insensitive" }, isActive: true }
        });
        if (!activeShopCity) {
            return { isValid: false, message: `Shop of product '${item.product.name}' is located in an inactive city: ${shopAddress.city}` };
        }

        if (shippingCity && shopCity !== shippingCity) {
            return { isValid: false, message: `Orders and deliveries are only allowed within the same city. Shop city '${shopAddress.city}' does not match shipping city.` };
        }

        let availableStock = item.product.stockQuantity;

        if (item.productVariant) {
            if (!item.productVariant.isActive) {
                return { isValid: false, message: `Product variant '${item.productVariant.name}' is inactive.` };
            }
            availableStock = item.productVariant.stockQuantity;
        }

        if (availableStock < item.quantity) {
            return {
                isValid: false,
                message: `Insufficient stock for product '${item.product.name}'. Available: ${availableStock}, requested: ${item.quantity}.`
            };
        }
    }

    return { isValid: true, cart };
};

// Helper to calculate shipping fees based on vendor count
const computeShipping = (cart: any) => {
    const uniqueSellers = new Set(cart.items.map((item: any) => item.product.sellerId));
    if (uniqueSellers.size === 0) return 0;
    // $10 base shipping fee plus $5 for each additional unique vendor
    return 10 + (uniqueSellers.size - 1) * 5;
};

// Helper to calculate discount from coupon
const computeCouponDiscount = async (couponCode: string, subtotal: number, customerId: string) => {
    const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode }
    });

    if (!coupon || !coupon.isActive) {
        return { isValid: false, message: "Coupon is invalid or inactive" };
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
        return { isValid: false, message: "Coupon has not started yet" };
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
        return { isValid: false, message: "Coupon has expired" };
    }

    if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
        return {
            isValid: false,
            message: `Minimum order amount of $${coupon.minOrderAmount} is required to use this coupon`
        };
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
        return { isValid: false, message: "Coupon usage limit reached" };
    }

    const customerUsageCount = await prisma.couponUsage.count({
        where: {
            couponId: coupon.id,
            customerId
        }
    });

    if (customerUsageCount >= coupon.perCustomerLimit) {
        return { isValid: false, message: "You have reached the usage limit for this coupon" };
    }

    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
        discount = subtotal * (Number(coupon.discountValue) / 100);
        if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
            discount = Number(coupon.maxDiscount);
        }
    } else if (coupon.discountType === "FIXED_AMOUNT") {
        discount = Number(coupon.discountValue);
    } else if (coupon.discountType === "FREE_SHIPPING") {
        // Handled in grand total calculation by setting shipping to 0
        discount = 0;
    }

    return { isValid: true, coupon, discount: Math.min(discount, subtotal) };
};

export const validateCheckout = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const validation = await runCheckoutValidation(customerId);

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

        const validation = await runCheckoutValidation(customerId);
        if (!validation.isValid) {
            return res.status(400).json({
                message: validation.message
            });
        }

        const shippingTotal = computeShipping(validation.cart);

        return res.status(200).json({
            shippingTotal
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

        const { subtotal = 0, discount = 0 } = req.body;
        const netAmount = Math.max(0, subtotal - discount);
        const taxTotal = netAmount * 0.08; // flat 8%

        return res.status(200).json({
            taxTotal
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
        const { couponCode } = req.body;

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

        const validation = await runCheckoutValidation(customerId);
        if (!validation.isValid) {
            return res.status(400).json({
                message: validation.message
            });
        }

        let subtotal = 0;
        for (const item of validation.cart!.items) {
            const price = item.productVariant ? Number(item.productVariant.price) : Number(item.product.price);
            subtotal += price * item.quantity;
        }

        const couponResult = await computeCouponDiscount(couponCode.trim(), subtotal, customerId);

        if (!couponResult.isValid) {
            return res.status(400).json({
                message: couponResult.message
            });
        }

        return res.status(200).json({
            message: "Coupon applied successfully",
            coupon: couponResult.coupon,
            discount: couponResult.discount
        });

    } catch (error) {
        console.error("APPLY COUPON ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
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
        const { couponCode } = req.body;

        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const validation = await runCheckoutValidation(customerId);
        if (!validation.isValid) {
            return res.status(400).json({
                message: validation.message
            });
        }

        const cart = validation.cart!;
        let subtotal = 0;
        const itemsSummary = [];

        for (const item of cart.items) {
            const price = item.productVariant ? Number(item.productVariant.price) : Number(item.product.price);
            const total = price * item.quantity;
            subtotal += total;

            itemsSummary.push({
                productId: item.productId,
                productVariantId: item.productVariantId,
                name: item.product.name,
                variantName: item.productVariant?.name || null,
                quantity: item.quantity,
                unitPrice: price,
                totalPrice: total
            });
        }

        let discountTotal = 0;
        let couponDetails = null;
        let isFreeShipping = false;

        if (couponCode?.trim()) {
            const couponResult = await computeCouponDiscount(couponCode.trim(), subtotal, customerId);
            if (couponResult.isValid) {
                discountTotal = couponResult.discount!;
                couponDetails = couponResult.coupon;
                if (couponResult.coupon?.discountType === "FREE_SHIPPING") {
                    isFreeShipping = true;
                }
            }
        }

        let shippingTotal = computeShipping(cart);
        if (isFreeShipping) {
            shippingTotal = 0;
        }

        const taxTotal = Math.max(0, subtotal - discountTotal) * 0.08;
        const grandTotal = subtotal - discountTotal + shippingTotal + taxTotal;

        return res.status(200).json({
            checkoutSummary: {
                items: itemsSummary,
                subtotal,
                shippingTotal,
                discountTotal,
                taxTotal,
                grandTotal,
                appliedCoupon: couponDetails
                    ? {
                          id: couponDetails.id,
                          code: couponDetails.code,
                          discountType: couponDetails.discountType,
                          discountValue: Number(couponDetails.discountValue)
                      }
                    : null
            }
        });

    } catch (error) {
        console.error("CHECKOUT ERROR:", error);
        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
};
