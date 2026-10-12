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

import { notificationService } from "../../../services/notification/notification.service.js";

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
        await notificationService.createNotification({
            recipientType,
            recipientId,
            type,
            title,
            body,
            data
        });
    } catch (error) {
        console.error("SEND PAYMENT NOTIFICATION ERROR:", error);
    }
};
