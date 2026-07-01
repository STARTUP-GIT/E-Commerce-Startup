import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import jwt from "jsonwebtoken";

interface JwtPayload {
    id: string;
}

declare global {
    namespace Express {
        interface Request {
            adminId?: string;
        }
    }
}

export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let token = req.cookies.admin_session;

        // Fallback to Authorization Header
        if (!token && req.headers.authorization?.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET_KEY!
        ) as JwtPayload;

        const admin = await prisma.admin.findUnique({
            where: { id: decoded.id }
        });

        if (!admin || !admin.isActive) {
            return res.status(401).json({
                message: "Unauthorized or deactivated admin account"
            });
        }

        req.adminId = decoded.id;
        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid token"
        });
    }
};
