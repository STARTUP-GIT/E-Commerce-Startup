import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import jwt from "jsonwebtoken";

interface JwtPayload {
    id: string;
}

declare global {
    namespace Express {
        interface Request {
            sellerId?: string;
        }
    }
}

export const sellerAuth = async (req: Request, res: Response, next: NextFunction) => {
    const url = (req.originalUrl || "").split('?')[0];
    const method = req.method;

    try {
        const token = req.cookies.seller_session;

        if (!token) {
            logger.warn("sellerAuth: No session cookie", { method, url });
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;
        } catch (jwtError: any) {
            logger.warn("sellerAuth: JWT verification failed", { method, url, jwtError: jwtError.message });
            return res.status(401).json({ message: "Invalid token" });
        }

        const seller = await prisma.seller.findUnique({
            where: { id: decoded.id },
            include: { shop: true }
        });

        if (!seller) {
            logger.warn("sellerAuth: Seller not found", { sellerId: decoded.id, method, url });
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (seller.isDeactivated || seller.scheduledDeleteAt !== null) {
            logger.warn("sellerAuth: Seller is deactivated", {
                sellerId: seller.id,
                email: seller.email,
                isDeactivated: seller.isDeactivated,
                scheduledDeleteAt: seller.scheduledDeleteAt,
                method,
                url
            });
            return res.status(401).json({ message: "Unauthorized" });
        }

        const isBanAppeal = url.includes('/api/shop/ban-appeal');

        if (seller.isBanned && !isBanAppeal) {
            logger.warn("sellerAuth: Seller is banned", { sellerId: seller.id, email: seller.email, method, url });
            return res.status(401).json({
                message: "Unauthorized - Seller is banned"
            });
        }

        // ENFORCE ACTIVE SHOP AND STATUS CHECK FOR ALL DASHBOARD ACTIONS
        const shop = seller.shop;
        const isShopActive = seller.status === "APPROVED" && shop !== null && shop.isActive && !shop.isBanned && !seller.isBanned;

        logger.info("sellerAuth: Request authorized", {
            sellerId: seller.id,
            email: seller.email,
            sellerStatus: seller.status,
            shopId: shop?.id ?? null,
            shopIsActive: shop?.isActive ?? false,
            isShopActive,
            method,
            url
        });

        if (!isShopActive) {
            const isInitialCreate = url.includes('/api/shop') && method === 'POST' && !shop;
            
            // Allow updating shop or applying for approval only if in DRAFT or REJECTED
            const isAllowedUpdate = url.includes('/api/shop') && method === 'PUT' && 
                                    (seller.status === "PENDING_VERIFICATION" || seller.status === "REJECTED");
                                    
            const isApplyApproval = url.includes('/api/shop/apply-approval') && method === 'POST' &&
                                    (seller.status === "PENDING_VERIFICATION" || seller.status === "REJECTED");
            
            // Allow managing bank details only if in DRAFT or REJECTED
            const isBankAccountRoute = url.includes('/api/shop/bank-account') && 
                                        (method === 'GET' || (method === 'POST' && (seller.status === "PENDING_VERIFICATION" || seller.status === "REJECTED")));

            const isAllowedRoute = 
                url.includes('/api/shop/approval-status') || 
                url.includes('/api/auth/profile') || 
                url.includes('/api/auth/logout') || 
                url.includes('/api/shop/ban-appeal') ||
                url.includes('/api/locations/') || 
                (url.includes('/api/shop') && method === 'GET') ||
                isInitialCreate ||
                isAllowedUpdate ||
                isApplyApproval ||
                isBankAccountRoute;

            if (!isAllowedRoute) {
                logger.warn("sellerAuth: Route blocked — shop inactive", {
                    sellerId: seller.id,
                    email: seller.email,
                    sellerStatus: seller.status,
                    method,
                    url,
                    shopId: shop?.id ?? null,
                    shopIsActive: shop?.isActive ?? false
                });
                return res.status(403).json({
                    message: "Your shop is currently inactive. Shop management actions are disabled until it is reactivated by an administrator."
                });
            }
        }

        req.sellerId = decoded.id;

        next();

    } catch (error: any) {
        logger.error("sellerAuth: Unexpected error", {
            method,
            url,
            error: error?.message,
            stack: error?.stack
        });
        return res.status(401).json({
            message: "Invalid token"
        });
    }

};
