import jwt from "jsonwebtoken";
import {prisma} from "../config/prisma.js";
import type { Request,Response,NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      sellerId?: string;
    }
  }
}

export const sellerAuth = async (req : Request, res : Response, next : NextFunction) => {
  try {
    console.log("[sellerAuth] JWT_SECRET_KEY loaded:", !!process.env.JWT_SECRET_KEY);

    const token = req.cookies?.seller_session;

    if (!token) {
      console.warn("[sellerAuth] FAIL — No seller_session cookie. cookies:", JSON.stringify(Object.keys(req.cookies || {})));
      return res.status(401).json({ message: "Unauthorized" });
    }

    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!);
      console.log("[sellerAuth] OK — sellerId:", decoded?.id);
    } catch (err: any) {
      const reason = err?.name === 'TokenExpiredError' ? 'JWT expired' : `JWT invalid: ${err?.message}`;
      console.error("[sellerAuth] FAIL —", reason, "| token length:", token?.length, "| token preview:", token?.substring(0, 20) + "...");
      return res.status(401).json({ message: "JWT verification failed", reason });
    }

    const seller = await prisma.seller.findUnique({
      where: {
        id: decoded.id,
      },
    });

    if (!seller) {
      return res.status(401).json({
        message: "Seller not found",
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