import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/token.js";

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
        const cookieToken = req.cookies?.customer_session;
        const authHeader = req.headers.authorization;
        const headerToken = authHeader?.startsWith("Bearer ")
            ? authHeader.substring(7)
            : (req.headers["x-customer-token"] as string | undefined);

        const token = headerToken || cookieToken;

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized",
                reason: "No customer authentication token received",
                isExpired: false
            });
        }

        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
        } catch (jwtErr: any) {
            const isExpired = jwtErr?.name === 'TokenExpiredError';
            return res.status(401).json({
                message: "Unauthorized",
                reason: isExpired ? "JWT expired" : `JWT invalid: ${jwtErr?.message}`,
                isExpired
            });
        }

        const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });

        if (!customer) {
            return res.status(401).json({
                message: "Unauthorized",
                reason: "Customer not found"
            });
        }

        if (customer.isBanned) {
            return res.status(403).json({ message: "Account is banned", reason: "Customer is banned" });
        }

        if (customer.isDeactivated) {
            return res.status(403).json({ message: "Account is deactivated", reason: "Customer is deactivated" });
        }

        if (customer.scheduledDeleteAt !== null) {
            return res.status(403).json({ message: "Account scheduled for deletion", reason: "Customer account scheduled for deletion" });
        }

        req.customerId = decoded.id;
        next();

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

