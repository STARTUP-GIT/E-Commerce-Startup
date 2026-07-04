import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
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
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // ===== DIAGNOSTIC: Cookie & Cookie-Parser =====
    const allCookies = req.cookies ? Object.keys(req.cookies) : [];
    const hasCookieParser = typeof req.cookies === 'object' && req.cookies !== null;
    const token: string | undefined = req.cookies?.seller_session;

    console.log(`[sellerAuth:${requestId}] ===== AUTH DIAGNOSTIC START =====`);
    console.log(`[sellerAuth:${requestId}] Method: ${method}, URL: ${url}`);
    console.log(`[sellerAuth:${requestId}] cookie-parser present: ${hasCookieParser}`);
    console.log(`[sellerAuth:${requestId}] All cookie names: ${JSON.stringify(allCookies)}`);
    console.log(`[sellerAuth:${requestId}] seller_session cookie found: ${!!token}`);
    console.log(`[sellerAuth:${requestId}] seller_session length: ${token ? token.length : 0}`);
    console.log(`[sellerAuth:${requestId}] seller_session preview: ${token ? token.substring(0, 30) + '...' : 'N/A'}`);

    try {
        if (!token) {
            console.log(`[sellerAuth:${requestId}] FAIL: seller_session missing`);
            return res.status(401).json({ message: "seller_session missing" });
        }

        // ===== DIAGNOSTIC: JWT Secret =====
        const secretExists = !!process.env.JWT_SECRET_KEY;
        console.log(`[sellerAuth:${requestId}] JWT_SECRET_KEY exists: ${secretExists}`);
        console.log(`[sellerAuth:${requestId}] JWT_SECRET_KEY length: ${process.env.JWT_SECRET_KEY ? process.env.JWT_SECRET_KEY.length : 0}`);

        // ===== DIAGNOSTIC: JWT Verify =====
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;
            console.log(`[sellerAuth:${requestId}] JWT verify: SUCCESS`);
            console.log(`[sellerAuth:${requestId}] Decoded payload: ${JSON.stringify(decoded)}`);
            console.log(`[sellerAuth:${requestId}] Payload ID field: ${decoded.id}`);
            console.log(`[sellerAuth:${requestId}] Payload has 'id': ${'id' in decoded}`);
            console.log(`[sellerAuth:${requestId}] Payload has 'userId': ${'userId' in decoded}`);
            console.log(`[sellerAuth:${requestId}] Payload has 'sellerId': ${'sellerId' in decoded}`);
            console.log(`[sellerAuth:${requestId}] Payload has 'sub': ${'sub' in decoded}`);
        } catch (jwtError: any) {
            console.log(`[sellerAuth:${requestId}] JWT verify: FAILED`);
            console.log(`[sellerAuth:${requestId}] Error name: ${jwtError.name}`);
            console.log(`[sellerAuth:${requestId}] Error message: ${jwtError.message}`);
            console.log(`[sellerAuth:${requestId}] Error stack: ${jwtError.stack}`);
            
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ message: "JWT expired" });
            } else if (jwtError.name === 'JsonWebTokenError') {
                if (jwtError.message.includes('malformed') || jwtError.message.includes('invalid')) {
                    return res.status(401).json({ message: "JWT malformed" });
                }
                if (jwtError.message.includes('signature')) {
                    return res.status(401).json({ message: "Invalid JWT signature" });
                }
                return res.status(401).json({ message: "Invalid JWT signature" });
            } else {
                return res.status(401).json({ message: "Invalid JWT signature" });
            }
        }

        // ===== DIAGNOSTIC: Prisma Seller Lookup =====
        console.log(`[sellerAuth:${requestId}] Querying prisma.seller.findUnique for id: ${decoded.id}`);

        const seller = await prisma.seller.findUnique({
            where: { id: decoded.id },
            include: { shop: true }
        });

        if (!seller) {
            console.log(`[sellerAuth:${requestId}] FAIL: Seller not found for id ${decoded.id}`);
            return res.status(401).json({ message: "Seller not found" });
        }

        console.log(`[sellerAuth:${requestId}] Seller found: id=${seller.id}, email=${seller.email}`);
        console.log(`[sellerAuth:${requestId}] Seller status: ${seller.status}`);
        console.log(`[sellerAuth:${requestId}] Seller isDeactivated: ${seller.isDeactivated}`);
        console.log(`[sellerAuth:${requestId}] Seller isBanned: ${seller.isBanned}`);
        console.log(`[sellerAuth:${requestId}] Seller scheduledDeleteAt: ${seller.scheduledDeleteAt}`);

        // ===== DIAGNOSTIC: Seller Validation =====
        if (seller.isDeactivated) {
            console.log(`[sellerAuth:${requestId}] FAIL: Seller is deactivated`);
            return res.status(401).json({ message: "Seller inactive" });
        }

        if (seller.scheduledDeleteAt !== null) {
            console.log(`[sellerAuth:${requestId}] FAIL: Seller scheduled for deletion`);
            return res.status(401).json({ message: "Seller inactive" });
        }

        const isBanAppeal = url.includes('/api/shop/ban-appeal');

        if (seller.isBanned && !isBanAppeal) {
            console.log(`[sellerAuth:${requestId}] FAIL: Seller is banned`);
            return res.status(401).json({ message: "Seller inactive" });
        }

        // Routes that bypass all shop validation
        const isAlwaysAllowed =
            url.includes('/api/auth/profile') ||
            url.includes('/api/auth/logout') ||
            url.includes('/api/shop/approval-status') ||
            url.includes('/api/shop/ban-appeal') ||
            url.includes('/api/locations/');

        if (isAlwaysAllowed) {
            console.log(`[sellerAuth:${requestId}] Route ${url} is always allowed, bypassing shop validation`);
            req.sellerId = decoded.id;
            return next();
        }

        // ===== DIAGNOSTIC: Shop Validation =====
        const shop = seller.shop;
        console.log(`[sellerAuth:${requestId}] Shop exists: ${!!shop}`);
        if (shop) {
            console.log(`[sellerAuth:${requestId}] Shop id: ${shop.id}`);
            console.log(`[sellerAuth:${requestId}] Shop isActive: ${shop.isActive}`);
            console.log(`[sellerAuth:${requestId}] Shop isBanned: ${shop.isBanned}`);
        }

        const isShopActive = seller.status === "APPROVED" && shop !== null && shop.isActive && !shop.isBanned && !seller.isBanned;
        console.log(`[sellerAuth:${requestId}] isShopActive (composite): ${isShopActive}`);

        if (!isShopActive) {
            let failureReason = "";

            if (seller.status !== "APPROVED") {
                failureReason = `Seller status is "${seller.status}" (requires "APPROVED")`;
                console.log(`[sellerAuth:${requestId}] FAIL: ${failureReason}`);
                return res.status(401).json({ message: "Seller not approved" });
            }

            if (!shop) {
                failureReason = "No shop exists for this seller";
                console.log(`[sellerAuth:${requestId}] FAIL: ${failureReason}`);
                return res.status(401).json({ message: "Shop not found" });
            }

            if (!shop.isActive) {
                failureReason = "Shop is not active";
                console.log(`[sellerAuth:${requestId}] FAIL: ${failureReason}`);
                return res.status(403).json({ message: "Shop inactive" });
            }

            if (shop.isBanned) {
                failureReason = "Shop is banned";
                console.log(`[sellerAuth:${requestId}] FAIL: ${failureReason}`);
                return res.status(403).json({ message: "Shop inactive" });
            }

            if (seller.isBanned) {
                failureReason = "Seller is banned";
                console.log(`[sellerAuth:${requestId}] FAIL: ${failureReason}`);
                return res.status(403).json({ message: "Seller inactive" });
            }

            // Check if the current route is in the allowed-while-inactive list
            // (seller.status is "APPROVED" here — PENDING_VERIFICATION/REJECTED branches skipped)
            const isInitialCreate = url.includes('/api/shop') && method === 'POST' && !shop;

            const isAllowedRoute =
                (url.includes('/api/shop') && method === 'GET') ||
                isInitialCreate;

            if (!isAllowedRoute) {
                console.log(`[sellerAuth:${requestId}] FAIL: Route ${url} not allowed while shop inactive`);
                return res.status(403).json({
                    message: `Your shop is currently inactive. Shop management actions are disabled until it is reactivated by an administrator.`
                });
            }

            console.log(`[sellerAuth:${requestId}] Route ${url} allowed through inactive exception`);
        }

        // ===== DIAGNOSTIC: Auth Success =====
        req.sellerId = decoded.id;
        console.log(`[sellerAuth:${requestId}] AUTH SUCCESS: sellerId=${seller.id}, continuing to next()`);
        console.log(`[sellerAuth:${requestId}] ===== AUTH DIAGNOSTIC END =====`);

        next();

    } catch (error: any) {
        console.log(`[sellerAuth:${requestId}] CATCH: Unexpected error: ${error?.message}`);
        console.log(`[sellerAuth:${requestId}] Stack: ${error?.stack}`);
        return res.status(401).json({
            message: "Authentication error"
        });
    }

};
