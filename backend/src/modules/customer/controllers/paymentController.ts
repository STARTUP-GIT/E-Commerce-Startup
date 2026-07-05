import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import {
    createPayment as createPaymentService,
    verifyPayment as verifyPaymentService,
    refundPayment as refundPaymentService
} from "../../payments/services/payment.service.js";

export const createPayment = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const payment = await createPaymentService({
            ...req.body,
            customerId
        });

        return res.status(200).json(payment);
    } catch (error: any) {
        console.error("CREATE PAYMENT ERROR:", error);
        return res.status(500).json({
            message: error.message || "Internal Server Error"
        });
    }
};

export const verifyPayment = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const payment = await verifyPaymentService({
            ...req.body,
            customerId
        });

        return res.status(200).json(payment);
    } catch (error: any) {
        console.error("VERIFY PAYMENT ERROR:", error);
        return res.status(500).json({
            message: error.message || "Internal Server Error"
        });
    }
};

export const refundPayment = async (req: Request, res: Response) => {
    try {
        const customerId = req.customerId;
        if (!customerId) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const { paymentId } = req.body;
        if (!paymentId) {
            return res.status(400).json({
                message: "paymentId is required"
            });
        }

        const paymentRecord = await prisma.payment.findUnique({
            where: { id: paymentId }
        });
        if (!paymentRecord || paymentRecord.customerId !== customerId) {
            return res.status(403).json({
                message: "Forbidden"
            });
        }

        const refund = await refundPaymentService(req.body);

        return res.status(200).json(refund);
    } catch (error: any) {
        console.error("REFUND PAYMENT ERROR:", error);
        return res.status(500).json({
            message: error.message || "Internal Server Error"
        });
    }
};

export const paymentWebhook = async (req: Request, res: Response) => {
    try {
        // Webhooks do not require customer authentication session
        return res.status(200).json({
            message: "Webhook received"
        });
    } catch (error: any) {
        console.error("PAYMENT WEBHOOK ERROR:", error);
        return res.status(500).json({
            message: error.message || "Internal Server Error"
        });
    }
};
