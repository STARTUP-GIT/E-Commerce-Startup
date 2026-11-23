import { prisma } from "../../../config/prisma.js";
import * as razorpayService from "./razorpay.service.js";
import * as phonepeService from "./phonepe.service.js";
import { sendPaymentNotification } from "../utils/paymentHelper.js";
import { IndianGstService, roundCurrency } from "../../../services/gst/gst.service.js";
import { ServiceabilityService } from "../../../services/location/serviceability.service.js";

// Helper to calculate payment totals (including packing fees, shipping, platform fee placeholder, and GST)
export const calculateTotals = async (params: {
    customerId: string;
    couponCode?: string;
    packingFees?: { sellerId: string; amount: number }[];
    shippingAddressId?: string;
    buyNow?: { productId: string; productVariantId?: string; quantity: number };
    selectedDeliveryMethod?: string;
}) => {
    const { customerId, couponCode, packingFees = [], shippingAddressId, buyNow, selectedDeliveryMethod } = params;

    let cart: any = null;
    if (buyNow) {
        const product = await prisma.product.findUnique({
            where: { id: buyNow.productId },
            include: {
                seller: {
                    include: {
                        shop: true,
                        addresses: true
                    }
                }
            }
        });
        if (!product) {
            throw new Error(`Product not found`);
        }

        let productVariant = null;
        if (buyNow.productVariantId) {
            productVariant = await prisma.productVariant.findUnique({
                where: { id: buyNow.productVariantId }
            });
            if (!productVariant) {
                throw new Error(`Product variant not found`);
            }
        }

        cart = {
            id: "temp_buy_now_cart",
            customerId,
            items: [
                {
                    id: "temp_buy_now_item",
                    productId: buyNow.productId,
                    productVariantId: buyNow.productVariantId || null,
                    quantity: buyNow.quantity,
                    product,
                    productVariant
                }
            ]
        };
    } else {
        cart = await prisma.cart.findUnique({
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
    }

    let shippingAddressRecord: any = null;
    let shippingCity = "";
    if (shippingAddressId) {
        shippingAddressRecord = await prisma.customerAddress.findUnique({
            where: { id: shippingAddressId }
        });
        if (!shippingAddressRecord) {
            throw new Error("Shipping address not found");
        }
        const address = shippingAddressRecord;
        shippingCity = (address.district || address.city).trim().toLowerCase();

        // Verify shipping location is serviceable using the authoritative serviceability engine
        const serviceabilityResult = await ServiceabilityService.checkServiceability({
            state: address.state,
            district: address.district || address.city,
            city: address.city,
            postalCode: address.postalCode,
            userRole: "CUSTOMER"
        });

        if (!serviceabilityResult.isServiceable) {
            throw new Error(serviceabilityResult.message || `Delivery is not currently available at your location (${address.city || address.district}, ${address.state}). Coming soon to your area.`);
        }
    } else if (customerId) {
        shippingAddressRecord = await prisma.customerAddress.findFirst({
            where: { customerId, isDefault: true }
        }) || await prisma.customerAddress.findFirst({
            where: { customerId }
        });
    }

    if (!cart || cart.items.length === 0) {
        throw new Error("Cart is empty");
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
        const shopCity = (shopAddress.district || shopAddress.city).trim().toLowerCase();

        const sellerStateRecord = await prisma.state.findFirst({
            where: { name: { equals: shopAddress.state.trim(), mode: "insensitive" as const }, isActive: true }
        });
        if (!sellerStateRecord) {
            throw new Error(`Shop of product '${product.name}' is located in an inactive state: ${shopAddress.state}`);
        }

        const activeShopCity = await prisma.city.findFirst({
            where: {
                state: { equals: sellerStateRecord.name, mode: "insensitive" as const },
                OR: [
                    { name: { equals: shopAddress.city.trim(), mode: "insensitive" as const } },
                    ...(shopAddress.district ? [{ name: { equals: shopAddress.district.trim(), mode: "insensitive" as const } }] : []),
                ],
                isActive: true
            }
        });
        if (!activeShopCity) {
            throw new Error(`Shop of product '${product.name}' is located in an inactive region: ${shopAddress.city || shopAddress.district}`);
        }

        if (shippingCity && shopCity !== shippingCity) {
            throw new Error(`Orders and deliveries are only allowed within the same city/district. Shop location '${shopAddress.district || shopAddress.city}' does not match shipping location.`);
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

    // 2. Determine and calculate Packing Fees dynamically from database Shop configuration
    let packingFeeTotal = 0;
    const validatedPackingFeesBySeller = new Map<string, number>();

    for (const sellerId of sellerSubtotals.keys()) {
        const shop = sellerShopMap.get(sellerId);
        let amount = 0;
        // Enforce admin approval and active toggle
        if (shop && shop.packingFeeApprovalStatus === "APPROVED" && (shop.packingFeeEnabled || shop.enablePackingFee)) {
            const rawAmount = Number(shop.packingFeeAmount) || 0;
            // Never exceed the approved maximum ceiling
            const maxApproved = shop.packingFeeApprovedMaxAmount !== null && shop.packingFeeApprovedMaxAmount !== undefined
                ? Number(shop.packingFeeApprovedMaxAmount)
                : rawAmount;
            amount = Math.max(0, Math.min(rawAmount, maxApproved));
        }
        validatedPackingFeesBySeller.set(sellerId, amount);
        packingFeeTotal += amount;
    }

    // 3. Shipping charges (0 if Seller Delivery is selected)
    const uniqueSellersCount = sellerSubtotals.size;
    let shippingTotal = 0;
    const isSellerFulfilled = selectedDeliveryMethod === "SELF_DELIVERY" || selectedDeliveryMethod === "SELLER_DELIVERY";
    if (!isSellerFulfilled) {
        shippingTotal = uniqueSellersCount > 0 ? 10 + (uniqueSellersCount - 1) * 5 : 0;
    }

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

    // 5. Platform Fee Control (from authoritative database Settings)
    let platformFeeTotal = 10;
    let isFeeEnabled = true;

    try {
        const settingsRow = await prisma.marketplaceSetting.findUnique({ where: { id: 1 } });
        if (settingsRow && settingsRow.data) {
            const data = settingsRow.data as any;

            isFeeEnabled = data.platformFeeEnabled !== false;
            if (!isFeeEnabled) {
                platformFeeTotal = 0;
            } else if (typeof data.platformFee === 'number') {
                platformFeeTotal = Math.max(0, data.platformFee);
            } else if (data.platformFee && typeof data.platformFee.fixedAmount === 'number') {
                platformFeeTotal = Math.max(0, data.platformFee.fixedAmount);
            }
        }
    } catch (e) {
        console.error("Error reading platform settings, using defaults:", e);
    }

    // 6. Indian GST Architecture Calculation (Central Service)
    const effectiveAddress = shippingAddressRecord || { state: "Karnataka", country: "India" };
    const gstBreakdown = await IndianGstService.calculateOrderGst({
        cartItems: cart.items,
        shippingAddress: effectiveAddress,
        platformFeeAmount: platformFeeTotal,
        platformFeeEnabled: isFeeEnabled,
        deliveryFeeAmount: shippingTotal
    });

    const subtotalAfterDiscount = Math.max(0, productSubtotal - discountTotal);
    const grandTotal = gstBreakdown.grandTotal;

    return {
        cart,
        productSubtotal,
        discountTotal,
        subtotal: subtotalAfterDiscount,
        packingFeeTotal,
        shippingTotal,
        platformFeeTotal: isFeeEnabled ? platformFeeTotal : 0,
        gstPercentage: gstBreakdown.platformFeeGstRate,
        gstAmount: gstBreakdown.totalTaxAmount,
        grandTotal,
        appliedCoupon,
        sellerSubtotals,
        validatedPackingFeesBySeller,
        gstBreakdown
    };
};

export const createPayment = async (paymentData: {
    customerId: string;
    shippingAddressId: string;
    billingAddressId?: string;
    couponCode?: string;
    packingFees?: { sellerId: string; amount: number }[];
    buyNow?: { productId: string; productVariantId?: string; quantity: number };
}) => {
    const { customerId, shippingAddressId, couponCode, packingFees, buyNow } = paymentData;

    // 1. Calculate totals dynamically
    const totals = await calculateTotals({ customerId, couponCode, packingFees, shippingAddressId, buyNow });

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
    buyNow?: { productId: string; productVariantId?: string; quantity: number };
    selectedDeliveryMethod?: string;
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
        buyNow,
        selectedDeliveryMethod,
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
    const totals = await calculateTotals({ customerId, couponCode, packingFees, shippingAddressId, buyNow });
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
        validatedPackingFeesBySeller,
        gstBreakdown
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
                paymentMethod: "RAZORPAY",
                selectedDeliveryMethod: selectedDeliveryMethod || "ATLASBASKET_DELIVERY",
                subtotal: productSubtotal,
                shippingTotal,
                taxTotal: gstBreakdown ? gstBreakdown.totalTaxAmount : gstAmount,
                discountTotal,
                packingFeeTotal,
                platformFeeTotal: platformFeeTotal > 0 ? platformFeeTotal : null,
                grandTotal,
                currency: "INR",
                placedAt: new Date(),
                placeOfSupplyState: gstBreakdown?.placeOfSupplyState || "Karnataka",
                placeOfSupplyCode: gstBreakdown?.placeOfSupplyCode || "29",
                isInterState: gstBreakdown?.isInterState || false,
                productCgstAmount: gstBreakdown?.productCgstTotal || 0,
                productSgstAmount: gstBreakdown?.productSgstTotal || 0,
                productIgstAmount: gstBreakdown?.productIgstTotal || 0,
                platformFeeCgstAmount: gstBreakdown?.platformFeeCgstAmount || 0,
                platformFeeSgstAmount: gstBreakdown?.platformFeeSgstAmount || 0,
                platformFeeIgstAmount: gstBreakdown?.platformFeeIgstAmount || 0,
                gstBreakdownSnapshot: gstBreakdown ? (gstBreakdown as any) : undefined
            }
        });

        // Create SellerOrders and OrderItems
        const createdSellerOrdersMap = new Map<string, string>();
        for (const [sellerId, sellerSubtotal] of sellerSubtotals.entries()) {
            const sellerPackingFee = validatedPackingFeesBySeller.get(sellerId) || 0;
            const sCalc = gstBreakdown?.sellers.find((s: any) => s.sellerId === sellerId);
            const sellerTax = sCalc ? sCalc.totalTaxAmount : ((sellerSubtotal + sellerPackingFee) * gstPercentage) / 100;

            const seller = cart.items.find((item: any) => item.product.sellerId === sellerId)!.product.seller;
            const pickupSellerAddressId = seller.addresses?.[0]?.id;

            if (!pickupSellerAddressId) {
                throw new Error(`Seller does not have a registered pickup address.`);
            }

            const shop = seller.shop;
            const commissionPercent = shop && shop.commissionPercentage !== null && shop.commissionPercentage !== undefined 
                ? Number(shop.commissionPercentage) 
                : 10.0;
            const platformCommission = sCalc ? sCalc.platformCommission : sellerSubtotal * (commissionPercent / 100);
            const sellerEarnings = sCalc ? (sCalc.sellerEarnings + sellerPackingFee) : (sellerSubtotal - platformCommission + sellerPackingFee);
            const sellerInvoiceNumber = IndianGstService.generateInvoiceNumber("INV-SEL-", Date.now() % 1000000);

            const sellerOrder = await tx.sellerOrder.create({
                data: {
                    orderId: order.id,
                    sellerId,
                    pickupSellerAddressId,
                    status: "PENDING",
                    paymentMethod: "RAZORPAY",
                    selectedDeliveryMethod: selectedDeliveryMethod || "ATLASBASKET_DELIVERY",
                    subtotal: sellerSubtotal,
                    shippingAmount: shippingTotal / sellerSubtotals.size, // Distribute shipping charges equally
                    taxAmount: sellerTax,
                    packingFee: sellerPackingFee,
                    platformFee: null,
                    platformCommission,
                    sellerEarnings,
                    deliveryMode: (selectedDeliveryMethod === "SELF_DELIVERY" || selectedDeliveryMethod === "SELLER_DELIVERY") ? "SELF" : shop.deliveryMode,
                    isInterState: sCalc?.isInterState || false,
                    cgstAmount: sCalc?.cgstAmount || 0,
                    sgstAmount: sCalc?.sgstAmount || 0,
                    igstAmount: sCalc?.igstAmount || 0,
                    tcsCgstAmount: sCalc?.tcsCgstAmount || 0,
                    tcsSgstAmount: sCalc?.tcsSgstAmount || 0,
                    tcsIgstAmount: sCalc?.tcsIgstAmount || 0,
                    totalTcsAmount: sCalc?.totalTcsAmount || 0,
                    commissionGstAmount: sCalc?.commissionGstAmount || 0,
                    invoiceNumber: sellerInvoiceNumber
                }
            });
            createdSellerOrdersMap.set(sellerId, sellerOrder.id);

            // Create items under this SellerOrder and reduce stock
            const sellerItems = cart.items.filter((item: any) => item.product.sellerId === sellerId);
            for (const item of sellerItems) {
                const price = item.productVariant ? Number(item.productVariant.price) : Number(item.product.price);
                const total = price * item.quantity;
                const itemCalc = sCalc?.items.find((i: any) => i.productId === item.productId && (!item.productVariantId || i.productVariantId === item.productVariantId));

                await tx.orderItem.create({
                    data: {
                        sellerOrderId: sellerOrder.id,
                        productId: item.productId,
                        productVariantId: item.productVariantId || null,
                        productName: item.product.name,
                        productSku: item.productVariant?.sku || item.product.sku || "GENERIC",
                        quantity: item.quantity,
                        unitPrice: price,
                        totalPrice: total,
                        taxableValue: itemCalc?.taxLine.taxableValue ?? total,
                        taxAmount: itemCalc?.taxLine.totalTax ?? 0,
                        hsnCode: itemCalc?.hsnCode || null,
                        taxRate: itemCalc?.taxLine.rate ?? 0,
                        cgstRate: itemCalc?.taxLine.cgstRate ?? 0,
                        cgstAmount: itemCalc?.taxLine.cgstAmount ?? 0,
                        sgstRate: itemCalc?.taxLine.sgstRate ?? 0,
                        sgstAmount: itemCalc?.taxLine.sgstAmount ?? 0,
                        igstRate: itemCalc?.taxLine.igstRate ?? 0,
                        igstAmount: itemCalc?.taxLine.igstAmount ?? 0,
                        isTaxInclusive: itemCalc?.isTaxInclusive ?? false
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

        // Record TCS under Section 52 into ledger
        if (gstBreakdown?.sellers) {
            for (const s of gstBreakdown.sellers) {
                if (s.isTcsApplicable && s.totalTcsAmount > 0) {
                    await tx.gstTcsLedger.create({
                        data: {
                            sellerId: s.sellerId,
                            sellerOrderId: createdSellerOrdersMap.get(s.sellerId) || null,
                            orderId: order.id,
                            transactionType: "COLLECTION",
                            taxPeriodMonth: new Date().toISOString().slice(0, 7),
                            taxableSupplyValue: s.taxableAmount,
                            isInterState: s.isInterState,
                            placeOfSupplyStateCode: s.placeOfSupplyCode,
                            cgstTcsRate: s.tcsCgstRate,
                            cgstTcsAmount: s.tcsCgstAmount,
                            sgstTcsRate: s.tcsSgstRate,
                            sgstTcsAmount: s.tcsSgstAmount,
                            igstTcsRate: s.tcsIgstRate,
                            igstTcsAmount: s.tcsIgstAmount,
                            totalTcsAmount: s.totalTcsAmount,
                            remittedStatus: "PENDING"
                        }
                    });
                }
            }
        }

        // Create Payment record
        const invoiceNumber = IndianGstService.generateInvoiceNumber("INV-AB-", Date.now() % 1000000);
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
                gstPercentage: gstBreakdown ? gstBreakdown.platformFeeGstRate : gstPercentage,
                gstAmount: gstBreakdown ? gstBreakdown.totalTaxAmount : gstAmount,
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
        if (!buyNow) {
            await tx.cartItem.deleteMany({
                where: { cartId: cart.id }
            });
        }

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

export const processCodPayment = async (paymentData: {
    customerId: string;
    shippingAddressId: string;
    billingAddressId?: string;
    couponCode?: string;
    packingFees?: { sellerId: string; amount: number }[];
    buyNow?: { productId: string; productVariantId?: string; quantity: number };
    selectedDeliveryMethod?: string;
}) => {
    const {
        customerId,
        shippingAddressId,
        billingAddressId,
        couponCode,
        packingFees,
        buyNow,
        selectedDeliveryMethod = "PORTAL_DELIVERY"
    } = paymentData;

    // Check if COD is enabled globally
    const codSetting = await prisma.paymentMethodSetting.findUnique({
        where: { code: "COD" }
    });

    if (codSetting && !codSetting.enabled) {
        throw new Error("Cash on Delivery is currently disabled by administrator.");
    }

    const totals = await calculateTotals({ customerId, couponCode, packingFees, shippingAddressId, buyNow, selectedDeliveryMethod });
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
        validatedPackingFeesBySeller,
        gstBreakdown
    } = totals;

    const finalOrder = await prisma.$transaction(async (tx) => {
        const orderNumber = `ORD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

        const order = await tx.order.create({
            data: {
                orderNumber,
                customerId,
                shippingAddressId,
                billingAddressId: billingAddressId || null,
                couponId: appliedCoupon?.id || null,
                status: "PENDING_CONFIRMATION",
                paymentMethod: "COD",
                selectedDeliveryMethod: selectedDeliveryMethod || "ATLASBASKET_DELIVERY",
                subtotal: productSubtotal,
                shippingTotal,
                taxTotal: gstBreakdown ? gstBreakdown.totalTaxAmount : gstAmount,
                discountTotal,
                packingFeeTotal,
                platformFeeTotal: platformFeeTotal > 0 ? platformFeeTotal : null,
                grandTotal,
                currency: "INR",
                placedAt: new Date(),
                placeOfSupplyState: gstBreakdown?.placeOfSupplyState || "Karnataka",
                placeOfSupplyCode: gstBreakdown?.placeOfSupplyCode || "29",
                isInterState: gstBreakdown?.isInterState || false,
                productCgstAmount: gstBreakdown?.productCgstTotal || 0,
                productSgstAmount: gstBreakdown?.productSgstTotal || 0,
                productIgstAmount: gstBreakdown?.productIgstTotal || 0,
                platformFeeCgstAmount: gstBreakdown?.platformFeeCgstAmount || 0,
                platformFeeSgstAmount: gstBreakdown?.platformFeeSgstAmount || 0,
                platformFeeIgstAmount: gstBreakdown?.platformFeeIgstAmount || 0,
                gstBreakdownSnapshot: gstBreakdown ? (gstBreakdown as any) : undefined
            }
        });

        const createdSellerOrdersMap = new Map<string, string>();
        for (const [sellerId, sellerSubtotal] of sellerSubtotals.entries()) {
            const sellerPackingFee = validatedPackingFeesBySeller.get(sellerId) || 0;
            const sCalc = gstBreakdown?.sellers.find((s: any) => s.sellerId === sellerId);
            const sellerTax = sCalc ? sCalc.totalTaxAmount : ((sellerSubtotal + sellerPackingFee) * gstPercentage) / 100;

            const seller = cart.items.find((item: any) => item.product.sellerId === sellerId)!.product.seller;
            const pickupSellerAddressId = seller.addresses?.[0]?.id;

            if (!pickupSellerAddressId) {
                throw new Error(`Seller does not have a registered pickup address.`);
            }

            const shop = seller.shop;
            const commissionPercent = shop && shop.commissionPercentage !== null && shop.commissionPercentage !== undefined 
                ? Number(shop.commissionPercentage) 
                : 10.0;
            const platformCommission = sCalc ? sCalc.platformCommission : sellerSubtotal * (commissionPercent / 100);
            const sellerEarnings = sCalc ? (sCalc.sellerEarnings + sellerPackingFee) : (sellerSubtotal - platformCommission + sellerPackingFee);
            const sellerInvoiceNumber = IndianGstService.generateInvoiceNumber("INV-SEL-", Date.now() % 1000000);

            const sellerOrder = await tx.sellerOrder.create({
                data: {
                    orderId: order.id,
                    sellerId,
                    pickupSellerAddressId,
                    status: "PENDING",
                    paymentMethod: "COD",
                    selectedDeliveryMethod: selectedDeliveryMethod || "ATLASBASKET_DELIVERY",
                    subtotal: sellerSubtotal,
                    shippingAmount: shippingTotal / sellerSubtotals.size,
                    taxAmount: sellerTax,
                    packingFee: sellerPackingFee,
                    platformFee: null,
                    platformCommission,
                    sellerEarnings,
                    deliveryMode: (selectedDeliveryMethod === "SELF_DELIVERY" || selectedDeliveryMethod === "SELLER_DELIVERY") ? "SELF" : shop.deliveryMode,
                    isInterState: sCalc?.isInterState || false,
                    cgstAmount: sCalc?.cgstAmount || 0,
                    sgstAmount: sCalc?.sgstAmount || 0,
                    igstAmount: sCalc?.igstAmount || 0,
                    tcsCgstAmount: sCalc?.tcsCgstAmount || 0,
                    tcsSgstAmount: sCalc?.tcsSgstAmount || 0,
                    tcsIgstAmount: sCalc?.tcsIgstAmount || 0,
                    totalTcsAmount: sCalc?.totalTcsAmount || 0,
                    commissionGstAmount: sCalc?.commissionGstAmount || 0,
                    invoiceNumber: sellerInvoiceNumber
                }
            });
            createdSellerOrdersMap.set(sellerId, sellerOrder.id);

            const sellerItems = cart.items.filter((item: any) => item.product.sellerId === sellerId);
            for (const item of sellerItems) {
                const price = item.productVariant ? Number(item.productVariant.price) : Number(item.product.price);
                const total = price * item.quantity;
                const itemCalc = sCalc?.items.find((i: any) => i.productId === item.productId && (!item.productVariantId || i.productVariantId === item.productVariantId));

                await tx.orderItem.create({
                    data: {
                        sellerOrderId: sellerOrder.id,
                        productId: item.productId,
                        productVariantId: item.productVariantId || null,
                        productName: item.product.name,
                        productSku: item.productVariant?.sku || item.product.sku || "GENERIC",
                        quantity: item.quantity,
                        unitPrice: price,
                        totalPrice: total,
                        taxableValue: itemCalc?.taxLine.taxableValue ?? total,
                        taxAmount: itemCalc?.taxLine.totalTax ?? 0,
                        hsnCode: itemCalc?.hsnCode || null,
                        taxRate: itemCalc?.taxLine.rate ?? 0,
                        cgstRate: itemCalc?.taxLine.cgstRate ?? 0,
                        cgstAmount: itemCalc?.taxLine.cgstAmount ?? 0,
                        sgstRate: itemCalc?.taxLine.sgstRate ?? 0,
                        sgstAmount: itemCalc?.taxLine.sgstAmount ?? 0,
                        igstRate: itemCalc?.taxLine.igstRate ?? 0,
                        igstAmount: itemCalc?.taxLine.igstAmount ?? 0,
                        isTaxInclusive: itemCalc?.isTaxInclusive ?? false
                    }
                });

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

            await tx.orderTimelineEvent.create({
                data: {
                    entityType: "SELLER_ORDER",
                    sellerOrderId: sellerOrder.id,
                    orderId: order.id,
                    status: "PENDING",
                    title: "COD Order Placed",
                    description: "Cash on delivery order placed successfully."
                }
            });
        }

        // Record TCS under Section 52 into ledger
        if (gstBreakdown?.sellers) {
            for (const s of gstBreakdown.sellers) {
                if (s.isTcsApplicable && s.totalTcsAmount > 0) {
                    await tx.gstTcsLedger.create({
                        data: {
                            sellerId: s.sellerId,
                            sellerOrderId: createdSellerOrdersMap.get(s.sellerId) || null,
                            orderId: order.id,
                            transactionType: "COLLECTION",
                            taxPeriodMonth: new Date().toISOString().slice(0, 7),
                            taxableSupplyValue: s.taxableAmount,
                            isInterState: s.isInterState,
                            placeOfSupplyStateCode: s.placeOfSupplyCode,
                            cgstTcsRate: s.tcsCgstRate,
                            cgstTcsAmount: s.tcsCgstAmount,
                            sgstTcsRate: s.tcsSgstRate,
                            sgstTcsAmount: s.tcsSgstAmount,
                            igstTcsRate: s.tcsIgstRate,
                            igstTcsAmount: s.tcsIgstAmount,
                            totalTcsAmount: s.totalTcsAmount,
                            remittedStatus: "PENDING"
                        }
                    });
                }
            }
        }

        const invoiceNumber = IndianGstService.generateInvoiceNumber("INV-AB-", Date.now() % 1000000);
        await tx.payment.create({
            data: {
                orderId: order.id,
                customerId,
                amount: grandTotal,
                currency: "INR",
                status: "PENDING_COD",
                method: "COD",
                gatewayPaymentId: `COD_${Date.now()}`,
                gatewayOrderId: orderNumber,
                packingFee: packingFeeTotal,
                shippingCharge: shippingTotal,
                gstPercentage: gstBreakdown ? gstBreakdown.platformFeeGstRate : gstPercentage,
                gstAmount: gstBreakdown ? gstBreakdown.totalTaxAmount : gstAmount,
                platformFee: platformFeeTotal > 0 ? platformFeeTotal : null,
                invoiceNumber
            }
        });

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

        if (!buyNow) {
            await tx.cartItem.deleteMany({
                where: { cartId: cart.id }
            });
        }

        await tx.orderTimelineEvent.create({
            data: {
                entityType: "ORDER",
                orderId: order.id,
                status: "PENDING_CONFIRMATION",
                title: "COD Order Placed",
                description: "Order placed using Cash on Delivery. Payment pending confirmation upon delivery."
            }
        });

        return { ...order, invoiceNumber };
    });

    sendPaymentNotification({
        recipientId: customerId,
        recipientType: "CUSTOMER",
        type: "ORDER_PLACED",
        title: "Order Placed (COD)",
        body: `Your Cash on Delivery order of INR ${grandTotal.toFixed(2)} was placed. Order Number: ${finalOrder.orderNumber}`
    }).catch(err => console.error("Customer notify error:", err));

    for (const sellerId of sellerSubtotals.keys()) {
        sendPaymentNotification({
            recipientId: sellerId,
            recipientType: "SELLER",
            type: "ORDER_PLACED",
            title: "New COD Order Placed",
            body: `A new Cash on Delivery order (${finalOrder.orderNumber}) has been placed.`
        }).catch(err => console.error("Seller notify error:", err));
    }

    return finalOrder;
};