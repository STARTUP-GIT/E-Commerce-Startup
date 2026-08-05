import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import type { Request, Response, NextFunction } from "express";
import { getJwtSecret, verifyAccessToken } from "../config/token.js";

declare global {
  namespace Express {
    interface Request {
      sellerId?: string;
    }
  }
}

export const sellerAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookieToken = req.cookies?.seller_session;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : (req.headers["x-seller-token"] as string | undefined);

    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - missing seller token" });
    }

    let decoded: any;

    try {
      decoded = verifyAccessToken(token);
    } catch (err: any) {
      try {
        decoded = jwt.verify(token, getJwtSecret());
      } catch (innerErr: any) {
        console.warn("[sellerAuth] Token verification failed:", innerErr.message);
        return res.status(401).json({
          message: "JWT verification failed",
        });
      }
    }

    const targetId = decoded.id || decoded.userId || decoded.sellerId || decoded.sub;

    if (!targetId) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    const seller = await prisma.seller.findUnique({
      where: {
        id: targetId,
      },
    });

    if (!seller) {
      return res.status(401).json({
        message: "Seller not found",
      });
    }

    if (seller.isBanned) {
      return res.status(403).json({
        message: "Account is banned",
      });
    }

    if (seller.isDeactivated) {
      return res.status(403).json({
        message: "Account is deactivated",
      });
    }

    if (seller.status === "DISABLED" || seller.status === "BANNED") {
      return res.status(403).json({
        message: "Account access restricted",
      });
    }

    req.sellerId = seller.id;

    next();
  } catch (err) {
    console.error("[sellerAuth] Unexpected error:", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};