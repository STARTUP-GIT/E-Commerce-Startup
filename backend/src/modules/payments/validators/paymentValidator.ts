import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

const createPaymentSchema = z.object({
    shippingAddressId: z.string().min(1),
    couponId: z.string().optional(),
    paymentMethod: z.string().optional(),
});

const razorpayVerifySchema = z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
});

const phonepeVerifySchema = z.object({
    merchantTransactionId: z.string().min(1),
});

const refundSchema = z.object({
    paymentId: z.string().min(1),
});

export const validateCreatePaymentReq = (req: Request, res: Response, next: NextFunction) => {
    const result = createPaymentSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues.map((e: any) => e.message).join(", ") });
    return next();
};

export const validateVerifyPaymentReq = (req: Request, res: Response, next: NextFunction) => {
    const gateway = (process.env.PAYMENT_GATEWAY || "RAZORPAY").toUpperCase();
    if (gateway === "RAZORPAY") {
        const result = razorpayVerifySchema.safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: result.error.issues.map((e: any) => e.message).join(", ") });
    } else if (gateway === "PHONEPE") {
        const result = phonepeVerifySchema.safeParse(req.body);
        if (!result.success) return res.status(400).json({ message: result.error.issues.map((e: any) => e.message).join(", ") });
    }
    return next();
};

export const validateRefundPaymentReq = (req: Request, res: Response, next: NextFunction) => {
    const result = refundSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.issues.map((e: any) => e.message).join(", ") });
    return next();
};
