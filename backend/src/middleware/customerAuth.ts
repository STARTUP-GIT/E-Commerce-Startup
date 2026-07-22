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
        }
    }
}

export const customerAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {

        const token = req.cookies.customer_session;

        if (!token) {
            console.warn('[customerAuth] FAIL — No cookie received. cookies:', JSON.stringify(req.cookies));
            return res.status(401).json({
                message: "Unauthorized",
                reason: "No customer_session cookie received"
            });
        }

        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;
        } catch (jwtErr: any) {
            const reason = jwtErr?.name === 'TokenExpiredError' ? 'JWT expired' : `JWT invalid: ${jwtErr?.message}`;
            console.warn(`[customerAuth] FAIL — ${reason}. url:`, req.originalUrl);
            return res.status(401).json({
                message: "Unauthorized",
                reason
            });
        }

        const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });

        if (!customer) {
            console.warn('[customerAuth] FAIL — Customer not found in DB. id:', decoded.id, 'url:', req.originalUrl);
            return res.status(401).json({
                message: "Unauthorized",
                reason: "Customer not found"
            });
        }

        if (customer.isBanned) {
            console.warn('[customerAuth] FAIL — Customer is banned. id:', decoded.id);
            return res.status(401).json({ message: "Unauthorized", reason: "Customer is banned" });
        }

        if (customer.isDeactivated) {
            console.warn('[customerAuth] FAIL — Customer is deactivated. id:', decoded.id);
            return res.status(401).json({ message: "Unauthorized", reason: "Customer is deactivated" });
        }

        if (customer.scheduledDeleteAt !== null) {
            console.warn('[customerAuth] FAIL — Customer scheduled for deletion. id:', decoded.id);
            return res.status(401).json({ message: "Unauthorized", reason: "Customer account scheduled for deletion" });
        }

        req.customerId = decoded.id;
        console.log('[customerAuth] OK — customerId:', decoded.id, 'url:', req.originalUrl);

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
        const token = req.cookies.customer_session;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;
            const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
            if (customer && !customer.isBanned && !customer.isDeactivated && customer.scheduledDeleteAt === null) {
                req.customerId = decoded.id;
            }
        }
        next();
    } catch (error) {
        next();
    }
};

