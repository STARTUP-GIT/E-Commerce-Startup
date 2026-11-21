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
            adminId?: string;
        }
    }
}

export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const candidateTokens = extractCandidateTokens(req, "admin_session", "x-admin-token");

        if (candidateTokens.length === 0) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        let authenticatedAdminId: string | null = null;
        let hasInactiveAccount = false;

        for (const token of candidateTokens) {
            let decoded: JwtPayload | null = null;
            try {
                decoded = verifyAccessToken(token) as JwtPayload;
            } catch {
                try {
                    decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
                } catch {
                    decoded = null;
                }
            }

            if (!decoded?.id) continue;

            const admin = await prisma.admin.findUnique({
                where: { id: decoded.id }
            });

            if (admin) {
                if (admin.isActive) {
                    authenticatedAdminId = admin.id;
                    break;
                } else {
                    hasInactiveAccount = true;
                }
            }
        }

        if (authenticatedAdminId) {
            req.adminId = authenticatedAdminId;
            return next();
        }

        if (hasInactiveAccount) {
            return res.status(401).json({
                message: "Unauthorized or deactivated admin account"
            });
        }

        return res.status(401).json({
            message: "Invalid token"
        });

    } catch (error) {
        return res.status(401).json({
            message: "Invalid token"
        });
    }
};
