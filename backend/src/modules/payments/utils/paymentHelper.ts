import { prisma } from "../../../config/prisma.js";
import { NotificationType, NotificationChannel, NotificationStatus } from "@prisma/client";

// Validate that packing fee is within the allowed limits: <= min(5% of product total, 100 INR)
export const validatePackingFeeLimit = (productSubtotal: number, packingFee: number): boolean => {
    const allowedLimit = Math.min((productSubtotal * 5) / 100, 100);
    return packingFee <= allowedLimit;
};

// Allocate tax proportionally based on item/subtotal shares
export const allocateProportionalValue = (itemAmount: number, totalAmount: number, targetValue: number): number => {
    if (totalAmount <= 0) return 0;
    const share = itemAmount / totalAmount;
    return Number((share * targetValue).toFixed(2));
};

// Poly-recipient notification sender
export const sendPaymentNotification = async (params: {
    recipientId: string;
    recipientType: "CUSTOMER" | "SELLER";
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
}) => {
    try {
        const { recipientId, recipientType, type, title, body, data } = params;

        await prisma.notification.create({
            data: {
                customerId: recipientType === "CUSTOMER" ? recipientId : null,
                sellerId: recipientType === "SELLER" ? recipientId : null,
                type,
                channel: NotificationChannel.IN_APP,
                status: NotificationStatus.PENDING,
                title,
                body,
                data: data ? JSON.parse(JSON.stringify(data)) : null,
                sentAt: new Date()
            }
        });
    } catch (error) {
        console.error("SEND PAYMENT NOTIFICATION ERROR:", error);
    }
};
