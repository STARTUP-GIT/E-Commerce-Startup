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
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;
        const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });

        if (!customer || customer.isBanned || customer.isDeactivated || customer.scheduledDeleteAt !== null) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        req.customerId = decoded.id;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid token"
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

