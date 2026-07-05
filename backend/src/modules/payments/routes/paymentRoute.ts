import express from "express";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import {
    togglePackingFee,
    approvePackingFee,
    revokePackingFee,
    createPayment,
    verifyPayment,
    refundPayment,
    paymentWebhook,
    getPayment,
    getPaymentHistory,
    downloadInvoice
} from "../controllers/paymentController.js";
import { sellerAuth } from "../../../middleware/sellerAuth.js";
import { customerAuth } from "../../../middleware/customerAuth.js";
import { adminAuth } from "../../../middleware/adminAuth.js";
import { prisma } from "../../../config/prisma.js";
import {
    validateCreatePaymentReq,
    validateVerifyPaymentReq,
    validateRefundPaymentReq
} from "../validators/paymentValidator.js";

const router = express.Router();

interface JwtPayload {
    id: string;
}

// Polymorphic authentication supporting customers, sellers, or administrative headers
const paymentAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customerToken = req.cookies.customer_session;
        const sellerToken = req.cookies.seller_session;
        const adminToken = req.cookies.admin_session || (req.headers.authorization?.toString().startsWith("Bearer ") ? req.headers.authorization.toString().split(" ")[1] : undefined);

        if (customerToken) {
            const decoded = jwt.verify(customerToken, process.env.JWT_SECRET_KEY!) as JwtPayload;
            const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
            if (!customer || customer.isBanned || customer.isDeactivated || customer.scheduledDeleteAt !== null) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            req.customerId = decoded.id;
            return next();
        }

        if (sellerToken) {
            const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET_KEY!) as JwtPayload;
            const seller = await prisma.seller.findUnique({ where: { id: decoded.id } });
            if (!seller || seller.isBanned || seller.isDeactivated || seller.status !== "ACTIVE" || seller.scheduledDeleteAt !== null) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            req.sellerId = decoded.id;
            return next();
        }

        if (adminToken) {
            const decoded = jwt.verify(adminToken, process.env.JWT_SECRET_KEY!) as JwtPayload;
            const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
            if (!admin || !admin.isActive) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            req.adminId = decoded.id;
            return next();
        }

        return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

// Seller packing fee configurations
router.patch("/api/payment/shop/packing-fee", sellerAuth, togglePackingFee);

// Admin packing fee approvals/revocations
router.patch("/api/payment/admin/shops/:shopId/packing-fee/approve", approvePackingFee);
router.patch("/api/payment/admin/shops/:shopId/packing-fee/revoke", revokePackingFee);

// Core payment flows
router.post("/api/payment/create", customerAuth, validateCreatePaymentReq, createPayment);
router.post("/api/payment/verify", customerAuth, validateVerifyPaymentReq, verifyPayment);
router.post("/api/payment/refund", customerAuth, validateRefundPaymentReq, refundPayment);

// Payment history & Invoices
router.get("/api/payment/history", paymentAuth, getPaymentHistory);
router.get("/api/payment/invoice/:paymentId", paymentAuth, downloadInvoice);
router.get("/api/payment/:paymentId", paymentAuth, getPayment);

// Payment webhooks
router.post("/api/payment/webhook", paymentWebhook);

export default router;
