import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import jwt from "jsonwebtoken";
import { getJwtSecret, verifyAccessToken } from "../config/token.js";
import { extractCandidateTokens } from "./tokenExtractor.js";

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
        const adminTokens = extractCandidateTokens(req, "admin_session", "x-admin-token");
        const customerTokens = extractCandidateTokens(req, "customer_session", "x-customer-token");
        const sellerTokens = extractCandidateTokens(req, "seller_session", "x-seller-token");
        const partnerTokens = extractCandidateTokens(req, "delivery_partner_session", "x-partner-token");

        // Try Admin
        for (const token of adminTokens) {
            try {
                let decoded: JwtPayload | null = null;
                try {
                    decoded = verifyAccessToken(token) as JwtPayload;
                } catch {
                    decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
                }
                if (decoded?.id) {
                    const admin = await prisma.admin.findUnique({ where: { id: decoded.id } });
                    if (admin && admin.isActive) {
                        req.adminId = decoded.id;
                        return next();
                    }
                }
            } catch (e) {}
        }

        // Try Customer
        for (const token of customerTokens) {
            try {
                let decoded: JwtPayload | null = null;
                try {
                    decoded = verifyAccessToken(token) as JwtPayload;
                } catch {
                    decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
                }
                if (decoded?.id) {
                    const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
                    if (customer && !customer.isBanned && !customer.isDeactivated && customer.scheduledDeleteAt === null) {
                        req.customerId = decoded.id;
                        return next();
                    }
                }
            } catch (e) {}
        }

        // Try Seller
        for (const token of sellerTokens) {
            try {
                let decoded: JwtPayload | null = null;
                try {
                    decoded = verifyAccessToken(token) as JwtPayload;
                } catch {
                    decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
                }
                if (decoded?.id) {
                    const seller = await prisma.seller.findUnique({ where: { id: decoded.id } });
                    if (seller && !seller.isBanned && !seller.isDeactivated && seller.status === "ACTIVE" && seller.scheduledDeleteAt === null) {
                        req.sellerId = decoded.id;
                        return next();
                    }
                }
            } catch (e) {}
        }

        // Try Delivery Partner
        for (const token of partnerTokens) {
            try {
                let decoded: JwtPayload | null = null;
                try {
                    decoded = verifyAccessToken(token) as JwtPayload;
                } catch {
                    decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
                }
                if (decoded?.id) {
                    const partner = await prisma.deliveryPartner.findUnique({ where: { id: decoded.id } });
                    if (partner && partner.status !== "SUSPENDED" && partner.status !== "INACTIVE") {
                        req.deliveryPartnerId = decoded.id;
                        return next();
                    }
                }
            } catch (e) {}
        }

        return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
