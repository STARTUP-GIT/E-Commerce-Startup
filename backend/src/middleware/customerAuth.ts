import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/token.js";
import { extractCandidateTokens } from "./tokenExtractor.js";

interface JwtPayload {
    id: string;
}

declare global {
    namespace Express {
        interface Request {
            customerId?: string;
        }
    }
}

export const customerAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const candidateTokens = extractCandidateTokens(req, "customer_session", "x-customer-token");

        if (candidateTokens.length === 0) {
            return res.status(401).json({
                message: "Unauthorized",
                reason: "No customer authentication token received",
                isExpired: false
            });
        }

        let authenticatedCustomerId: string | null = null;
        let lastErrorReason = "Invalid token";
        let isAnyExpired = false;

        for (const token of candidateTokens) {
            let decoded: JwtPayload | null = null;
            try {
                decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
            } catch (jwtErr: any) {
                if (jwtErr?.name === 'TokenExpiredError') isAnyExpired = true;
                continue;
            }

            if (!decoded?.id) continue;

            const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
            if (!customer) continue;

            if (customer.isBanned) {
                return res.status(403).json({ message: "Account is banned", reason: "Customer is banned" });
            }

            if (customer.isDeactivated) {
                return res.status(403).json({ message: "Account is deactivated", reason: "Customer is deactivated" });
            }

            if (customer.scheduledDeleteAt !== null) {
                return res.status(403).json({ message: "Account scheduled for deletion", reason: "Customer account scheduled for deletion" });
            }

            authenticatedCustomerId = customer.id;
            break;
        }

        if (authenticatedCustomerId) {
            req.customerId = authenticatedCustomerId;
            return next();
        }

        return res.status(401).json({
            message: "Unauthorized",
            reason: isAnyExpired ? "JWT expired" : lastErrorReason,
            isExpired: isAnyExpired
        });

    } catch (error) {
        console.error('[customerAuth] Unexpected error:', error);
        return res.status(401).json({
            message: "Invalid token",
            reason: "Unexpected auth error"
        });
    }
};

export const customerAuthOptional = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cookieToken = req.cookies?.customer_session;
        const authHeader = req.headers.authorization;
        const headerToken = authHeader?.startsWith("Bearer ")
            ? authHeader.substring(7)
            : (req.headers["x-customer-token"] as string | undefined);

        const token = headerToken || cookieToken;
        if (token) {
            try {
                const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
                const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
                if (customer && !customer.isBanned && !customer.isDeactivated && customer.scheduledDeleteAt === null) {
                    req.customerId = decoded.id;
                }
            } catch {
                // Ignore invalid optional token
            }
        }
        next();
    } catch {
        next();
    }
};

