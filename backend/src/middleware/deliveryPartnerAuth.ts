import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import jwt from "jsonwebtoken";

interface JwtPayload {
    id: string;
}

declare global {
    namespace Express {
        interface Request {
            deliveryPartnerId?: string;
        }
    }
}

export const deliveryPartnerAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.delivery_partner_session;

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;
        const partner = await prisma.deliveryPartner.findUnique({ where: { id: decoded.id } });

        if (!partner || partner.status === "SUSPENDED" || partner.status === "INACTIVE") {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        req.deliveryPartnerId = decoded.id;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid token"
        });
    }
};
