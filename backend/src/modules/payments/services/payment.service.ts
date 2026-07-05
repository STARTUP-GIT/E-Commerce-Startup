import { prisma } from "../../../config/prisma.js";
import * as razorpayService from "./razorpay.service.js";
import * as phonepeService from "./phonepe.service.js";
import { sendPaymentNotification } from "../utils/paymentHelper.js";

// Helper to calculate payment totals (including packing fees, shipping, platform fee placeholder, and GST)
export const calculateTotals = async (params: {
    customerId: string;
    couponCode?: string;
    packingFees?: { sellerId: string; amount: number }[];
    shippingAddressId?: string;
}) => {
    const { customerId, couponCode, packingFees = [], shippingAddressId } = params;

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
        throw new Error("Cart is empty");
    }

    let shippingCity = "";
    if (shippingAddressId) {
        const address = await prisma.customerAddress.findUnique({
            where: { id: shippingAddressId }
        });
        if (!address) {
            throw new Error("Shipping address not found");
        }
        shippingCity = address.city.trim().toLowerCase();

        // Verify shipping city is active
        const activeCity = await prisma.city.findFirst({
            where: { name: { equals: address.city.trim(), mode: "insensitive" }, isActive: true }
        });
        if (!activeCity) {
            throw new Error(`We do not operate in shipping city: ${address.city}`);
        }
    }

    let productSubtotal = 0;
    const sellerSubtotals = new Map<string, number>();
    const sellerShopMap = new Map<string, any>();

    for (const item of cart.items) {
        const product = item.product;
        if (product.isDeleted || product.status !== "ACTIVE") {
            throw new Error(`Product '${product.name}' is no longer active.`);
        }

        const seller = product.seller;
        if (seller.isBanned || seller.status !== "ACTIVE") {
            throw new Error(`Seller of product '${product.name}' is not approved or is banned.`);
        }

        if (!seller.shop || seller.shop.status !== "APPROVED") {
            throw new Error(`Shop of product '${product.name}' is inactive.`);
        }

        // Verify seller shop city matches shipping city
        const shopAddress = seller.addresses?.[0];
        if (!shopAddress) {
            throw new Error(`Seller shop address not found for product '${product.name}'`);
        }
        const shopCity = shopAddress.city.trim().toLowerCase();

        const activeShopCity = await prisma.city.findFirst({
            where: { name: { equals: shopAddress.city.trim(), mode: "insensitive" }, isActive: true }
        });
        if (!activeShopCity) {
            throw new Error(`Shop of product '${product.name}' is located in an inactive city: ${shopAddress.city}`);
        }

        if (shippingCity && shopCity !== shippingCity) {
            throw new Error(`Orders and deliveries are only allowed within the same city. Shop city '${shopAddress.city}' does not match shipping city.`);
        }

        sellerShopMap.set(seller.id, seller.shop);

        let availableStock = product.stockQuantity;
        if (item.productVariant) {
            if (!item.productVariant.isActive) {
                throw new Error(`Product variant '${item.productVariant.name}' is inactive.`);
            }
            availableStock = item.productVariant.stockQuantity;
        }

        if (availableStock < item.quantity) {
            throw new Error(`Insufficient stock for product '${product.name}'.`);
        }

        const price = item.productVariant ? Number(item.productVariant.price) : Number(product.price);
        const itemTotal = price * item.quantity;
        productSubtotal += itemTotal;

        const currentSellerSubtotal = sellerSubtotals.get(seller.id) || 0;
        sellerSubtotals.set(seller.id, currentSellerSubtotal + itemTotal);
    }

    // 2. Validate and calculate Packing Fees
    let packingFeeTotal = 0;
    const validatedPackingFeesBySeller = new Map<string, number>();

    for (const pf of packingFees) {
        const { sellerId, amount } = pf;
        const sellerSubtotal = sellerSubtotals.get(sellerId);
        if (!sellerSubtotal) continue;

        const shop = sellerShopMap.get(sellerId);
        if (!shop) continue;

        if (!shop.enablePackingFee || !shop.packingFeeApproved) {
            throw new Error(`Shop '${shop.name}' is not approved to charge packing fees.`);
        }

        // Limit validation: packing fee <= Math.min(5% of productTotal, 100 INR)
        const allowedPackingFee = Math.min((sellerSubtotal * 5) / 100, 100);
        if (amount > allowedPackingFee) {
            throw new Error(`Packing fee for '${shop.name}' exceeds the maximum allowed limit.`);
        }

        validatedPackingFeesBySeller.set(sellerId, amount);
        packingFeeTotal += amount;
    }

    for (const sellerId of sellerSubtotals.keys()) {
        if (!validatedPackingFeesBySeller.has(sellerId)) {
            validatedPackingFeesBySeller.set(sellerId, 0);
        }
    }

    // 3. Shipping charges
    const uniqueSellersCount = sellerSubtotals.size;
    let shippingTotal = uniqueSellersCount > 0 ? 10 + (uniqueSellersCount - 1) * 5 : 0;

    // 4. Coupon discount
    let discountTotal = 0;
    let isFreeShipping = false;
    let appliedCoupon = null;

    if (couponCode?.trim()) {
        const coupon = await prisma.coupon.findUnique({
            where: { code: couponCode.trim() }
        });

        if (coupon && coupon.isActive) {
            const now = new Date();
            const startsOk = !coupon.startsAt || coupon.startsAt <= now;
            const expiresOk = !coupon.expiresAt || coupon.expiresAt >= now;
            const minOk = !coupon.minOrderAmount || productSubtotal >= Number(coupon.minOrderAmount);
            const usageOk = coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit;

            const customerUsageCount = await prisma.couponUsage.count({
                where: { couponId: coupon.id, customerId }
            });
            const custLimitOk = customerUsageCount < coupon.perCustomerLimit;

            if (startsOk && expiresOk && minOk && usageOk && custLimitOk) {
                appliedCoupon = coupon;
                if (coupon.discountType === "PERCENTAGE") {
                    let discount = productSubtotal * (Number(coupon.discountValue) / 100);
                    if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
                        discount = Number(coupon.maxDiscount);
                    }
                    discountTotal = Math.min(discount, productSubtotal);
                } else if (coupon.discountType === "FIXED_AMOUNT") {
                    discountTotal = Math.min(Number(coupon.discountValue), productSubtotal);
                } else if (coupon.discountType === "FREE_SHIPPING") {
                    isFreeShipping = true;
                }
            }
        }
    }

    if (isFreeShipping) {
        shippingTotal = 0;
    }

    // 5. Future Platform Fee (Default 0, architecture ready)
    const platformFeeTotal = 0;

    // 6. GST Calculation (18% on discounted subtotal + packing + shipping + platform fee)
    const subtotalAfterDiscount = Math.max(0, productSubtotal - discountTotal);
    const taxableValue = subtotalAfterDiscount + packingFeeTotal + shippingTotal + platformFeeTotal;
    const gstPercentage = parseFloat(process.env.GST_PERCENTAGE || "18");
    const gstAmount = (taxableValue * gstPercentage) / 100;

    // 7. Grand Total
    const grandTotal = taxableValue + gstAmount;

    return {
        cart,
        productSubtotal,
        discountTotal,
        subtotal: subtotalAfterDiscount,
        packingFeeTotal,
        shippingTotal,
        platformFeeTotal,
        gstPercentage,
        gstAmount,
        grandTotal,
        appliedCoupon,
        sellerSubtotals,
        validatedPackingFeesBySeller
    };
};

export const createPayment = async (paymentData: {
    customerId: string;
    shippingAddressId: string;
    billingAddressId?: string;
    couponCode?: string;
    packingFees?: { sellerId: string; amount: number }[];
}) => {
    const { customerId, shippingAddressId, couponCode, packingFees } = paymentData;

    // 1. Calculate totals dynamically
    const totals = await calculateTotals({ customerId, couponCode, packingFees, shippingAddressId });

    const receipt = `RCPT_${Date.now()}`;
    const gateway = process.env.PAYMENT_GATEWAY || "RAZORPAY";

    // 2. Delegate to respective gateway
    if (gateway === "RAZORPAY") {
        const order = await razorpayService.createPayment({
            amount: totals.grandTotal,
            currency: "INR",
            receipt
        });
        return {
            gateway,
            gatewayOrderId: order.id,
            amount: totals.grandTotal,
            currency: "INR",
            totals
        };
    } else if (gateway === "PHONEPE") {
        const order = await phonepeService.createPayment({
            amount: totals.grandTotal,
            transactionId: receipt,
            merchantUserId: customerId
        });
        return {
            gateway,
            gatewayOrderId: order.merchantTransactionId,
            amount: totals.grandTotal,
            currency: "INR",
            totals,
            phonepeDetails: order
        };
    }

    throw new Error("Unsupported payment gateway");
};

export const verifyPayment = async (paymentData: {
    customerId: string;
    shippingAddressId: string;
    billingAddressId?: string;
    couponCode?: string;
    packingFees?: { sellerId: string; amount: number }[];
    // Gateway payload
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    merchantTransactionId?: string;
}) => {
    const {
        customerId,
        shippingAddressId,
        billingAddressId,
        couponCode,
        packingFees,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        merchantTransactionId
    } = paymentData;

    const gateway = process.env.PAYMENT_GATEWAY || "RAZORPAY";

    // 1. Verify Gateway Signature
    let isValid = false;
    if (gateway === "RAZORPAY") {
        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            throw new Error("Missing Razorpay verification parameters");
        }
        isValid = await razorpayService.verifyPayment({
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        });
    } else if (gateway === "PHONEPE") {
        if (!merchantTransactionId) {
            throw new Error("Missing PhonePe verification parameters");
        }
        const verifyResponse = await phonepeService.verifyPayment({ merchantTransactionId });
        isValid = verifyResponse.success;
    }

    if (!isValid) {
        throw new Error("Payment signature verification failed");
    }

    const gatewayOrderId = gateway === "RAZORPAY" ? razorpayOrderId : merchantTransactionId;
    const gatewayPaymentId = gateway === "RAZORPAY" ? razorpayPaymentId : `TXN_${merchantTransactionId}`;
    const gatewaySignature = gateway === "RAZORPAY" ? razorpaySignature : "PHONEPE_VERIFIED";

    // Prevent duplicate verification
    const existingPayment = await prisma.payment.findUnique({
        where: { gatewayPaymentId }
    });

    if (existingPayment) {
        throw new Error("Payment has already been processed and verified");
    }

    // 2. Re-calculate totals and check stock levels
    const totals = await calculateTotals({ customerId, couponCode, packingFees, shippingAddressId });
    const {
        cart,
        productSubtotal,
        discountTotal,
        packingFeeTotal,
        shippingTotal,
        platformFeeTotal,
        gstPercentage,
        gstAmount,
        grandTotal,
        appliedCoupon,
        sellerSubtotals,
        validatedPackingFeesBySeller
    } = totals;

    // 3. Atomically write the orders, reduce stock, clear cart
    const finalOrder = await prisma.$transaction(async (tx) => {
        const orderNumber = `ORD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

        // Create main Order
        const order = await tx.order.create({
            data: {
                orderNumber,
                customerId,
                shippingAddressId,
                billingAddressId: billingAddressId || null,
                couponId: appliedCoupon?.id || null,
                status: "CONFIRMED",
                subtotal: productSubtotal,
                shippingTotal,
                taxTotal: gstAmount,
                discountTotal,
                packingFeeTotal,
                platformFeeTotal: platformFeeTotal > 0 ? platformFeeTotal : null,
                grandTotal,
                currency: "INR",
                placedAt: new Date()
            }
        });

        // Create SellerOrders and OrderItems
        for (const [sellerId, sellerSubtotal] of sellerSubtotals.entries()) {
            const sellerPackingFee = validatedPackingFeesBySeller.get(sellerId) || 0;
            const sellerTaxable = sellerSubtotal + sellerPackingFee;
            const sellerTax = (sellerTaxable * gstPercentage) / 100;

            const seller = cart.items.find((item) => item.product.sellerId === sellerId)!.product.seller;
            const pickupSellerAddressId = seller.addresses?.[0]?.id;

            if (!pickupSellerAddressId) {
                throw new Error(`Seller does not have a registered pickup address.`);
            }

            const shop = seller.shop;
            const commissionPercent = shop && shop.commissionPercentage !== null && shop.commissionPercentage !== undefined 
                ? Number(shop.commissionPercentage) 
                : 10.0;
            const platformCommission = sellerSubtotal * (commissionPercent / 100);
            const sellerEarnings = sellerSubtotal - platformCommission + sellerPackingFee;

            const sellerOrder = await tx.sellerOrder.create({
                data: {
                    orderId: order.id,
                    sellerId,
                    pickupSellerAddressId,
                    status: "PENDING",
                    subtotal: sellerSubtotal,
                    shippingAmount: shippingTotal / sellerSubtotals.size, // Distribute shipping charges equally
                    taxAmount: sellerTax,
                    packingFee: sellerPackingFee,
                    platformFee: null,
                    platformCommission,
                    sellerEarnings
                }
            });

            // Create items under this SellerOrder and reduce stock
            const sellerItems = cart.items.filter((item) => item.product.sellerId === sellerId);
            for (const item of sellerItems) {
                const price = item.productVariant ? Number(item.productVariant.price) : Number(item.product.price);
                const total = price * item.quantity;

                await tx.orderItem.create({
                    data: {
                        sellerOrderId: sellerOrder.id,
                        productId: item.productId,
                        productVariantId: item.productVariantId || null,
                        productName: item.product.name,
                        productSku: item.productVariant?.sku || item.product.sku || "GENERIC",
                        quantity: item.quantity,
                        unitPrice: price,
                        totalPrice: total
                    }
                });

                // Reduce stock safely using conditional updates to prevent negative stock
                if (item.productVariantId) {
                    const updated = await tx.productVariant.updateMany({
                        where: { id: item.productVariantId, stockQuantity: { gte: item.quantity } },
                        data: { stockQuantity: { decrement: item.quantity } }
                    });
                    if (updated.count === 0) {
                        throw new Error(`Insufficient stock for product variant '${item.productVariant?.name || 'GENERIC'}'`);
                    }
                } else {
                    const updated = await tx.product.updateMany({
                        where: { id: item.productId, stockQuantity: { gte: item.quantity } },
                        data: { stockQuantity: { decrement: item.quantity } }
                    });
                    if (updated.count === 0) {
                        throw new Error(`Insufficient stock for product '${item.product.name}'`);
                    }
                }
            }

            // Create timeline event for SellerOrder
            await tx.orderTimelineEvent.create({
                data: {
                    entityType: "SELLER_ORDER",
                    sellerOrderId: sellerOrder.id,
                    orderId: order.id,
                    status: "PENDING",
                    title: "Order Placed",
                    description: "Order placed successfully with the seller."
                }
            });
        }

        // Create Payment record
        const invoiceNumber = `INV-${Date.now()}`;
        await tx.payment.create({
            data: {
                orderId: order.id,
                customerId,
                amount: grandTotal,
                currency: "INR",
                status: "COMPLETED",
                method: gateway === "RAZORPAY" ? "RAZORPAY" : "UPI",
                gatewayPaymentId,
                gatewayOrderId,
                gatewaySignature,
                packingFee: packingFeeTotal,
                shippingCharge: shippingTotal,
                gstPercentage,
                gstAmount,
                platformFee: platformFeeTotal > 0 ? platformFeeTotal : null,
                invoiceNumber,
                paidAt: new Date()
            }
        });

        // Increment coupon usage
        if (appliedCoupon) {
            await tx.coupon.update({
                where: { id: appliedCoupon.id },
                data: { usageCount: { increment: 1 } }
            });
            await tx.couponUsage.create({
                data: {
                    couponId: appliedCoupon.id,
                    customerId,
                    orderId: order.id,
                    discountApplied: discountTotal,
                    usedAt: new Date()
                }
            });
        }

        // Clear Cart
        await tx.cartItem.deleteMany({
            where: { cartId: cart.id }
        });

        // Create timeline event for main Order
        await tx.orderTimelineEvent.create({
            data: {
                entityType: "ORDER",
                orderId: order.id,
                status: "CONFIRMED",
                title: "Payment Verified",
                description: "Customer payment was successfully verified and order is created."
            }
        });

        return { ...order, invoiceNumber };
    });

    // Notify Customer
    sendPaymentNotification({
        recipientId: customerId,
        recipientType: "CUSTOMER",
        type: "PAYMENT_SUCCESS",
        title: "Payment Successful",
        body: `Your payment of INR ${grandTotal.toFixed(2)} was successful. Invoice: ${finalOrder.invoiceNumber}`
    }).catch(err => console.error("Customer notify error:", err));

    // Notify Sellers
    for (const sellerId of sellerSubtotals.keys()) {
        sendPaymentNotification({
            recipientId: sellerId,
            recipientType: "SELLER",
            type: "ORDER_PLACED",
            title: "New Order Placed",
            body: `A new order (${finalOrder.orderNumber}) has been placed by a customer.`
        }).catch(err => console.error("Seller notify error:", err));
    }

    return finalOrder;
};

export const refundPayment = async (paymentData: {
    paymentId: string;
    amount?: number;
}) => {
    const { paymentId, amount } = paymentData;

    const payment = await prisma.payment.findUnique({
        where: { id: paymentId }
    });

    if (!payment || payment.status !== "COMPLETED") {
        throw new Error("Completed payment record not found");
    }

    const refundValue = amount || Number(payment.amount);
    const gateway = process.env.PAYMENT_GATEWAY || "RAZORPAY";

    if (gateway === "RAZORPAY") {
        if (!payment.gatewayPaymentId) {
            throw new Error("Missing gateway payment ID");
        }
        const refund = await razorpayService.refundPayment({
            paymentId: payment.gatewayPaymentId,
            amount: refundValue
        });

        await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: "REFUNDED",
                refundAmount: refundValue,
                refundedAt: new Date()
            }
        });

        return refund;
    } else if (gateway === "PHONEPE") {
        if (!payment.gatewayOrderId) {
            throw new Error("Missing gateway order ID");
        }
        const refundTransactionId = `REFUND_${Date.now()}`;
        const refund = await phonepeService.refundPayment({
            originalTransactionId: payment.gatewayOrderId,
            refundTransactionId,
            amount: refundValue
        });

        await prisma.payment.update({
            where: { id: paymentId },
            data: {
                status: "REFUNDED",
                refundAmount: refundValue,
                refundedAt: new Date()
            }
        });

        return refund;
    }

    throw new Error("Unsupported payment gateway");
};