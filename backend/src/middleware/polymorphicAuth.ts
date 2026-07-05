import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import jwt from "jsonwebtoken";

interface JwtPayload {
    id: string;
}

declare global {
    namespace Express {
        interface Request {
            customerId?: string;
            sellerId?: string;
            deliveryPartnerId?: string;
            adminId?: string;
        }
    }
}

export const polymorphicAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminToken = req.cookies.admin_session || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : null);
        const customerToken = req.cookies.customer_session;
        const sellerToken = req.cookies.seller_session;
        const partnerToken = req.cookies.delivery_partner_session;

        // Try Admin
        if (adminToken) {
            try {
                const decoded = jwt.verify(adminToken, process.env.JWT_SECRET_KEY!) as JwtPayload;
                const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
                if (admin && admin.isActive) {
                    req.adminId = decoded.id;
                    return next();
                }
            } catch (e) {}
        }

        // Try Customer
        if (customerToken) {
            try {
                const decoded = jwt.verify(customerToken, process.env.JWT_SECRET_KEY!) as JwtPayload;
                const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
                if (customer && !customer.isBanned && !customer.isDeactivated && customer.scheduledDeleteAt === null) {
                    req.customerId = decoded.id;
                    return next();
                }
            } catch (e) {}
        }

        // Try Seller
        if (sellerToken) {
            try {
                const decoded = jwt.verify(sellerToken, process.env.JWT_SECRET_KEY!) as JwtPayload;
                const seller = await prisma.seller.findUnique({ where: { id: decoded.id } });
                if (seller && !seller.isBanned && !seller.isDeactivated && seller.status === "ACTIVE" && seller.scheduledDeleteAt === null) {
                    req.sellerId = decoded.id;
                    return next();
                }
            } catch (e) {}
        }

        // Try Delivery Partner
        if (partnerToken) {
            try {
                const decoded = jwt.verify(partnerToken, process.env.JWT_SECRET_KEY!) as JwtPayload;
                const partner = await prisma.deliveryPartner.findUnique({ where: { id: decoded.id } });
                if (partner && partner.status !== "SUSPENDED" && partner.status !== "INACTIVE") {
                    req.deliveryPartnerId = decoded.id;
                    return next();
                }
            } catch (e) {}
        }

        return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
