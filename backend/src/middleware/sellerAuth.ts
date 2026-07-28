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

    console.log("========== SELLER AUTH ==========");
    console.log("JWT_SECRET_KEY exists:", !!process.env.JWT_SECRET_KEY);
    console.log("JWT_SECRET_KEY length:", process.env.JWT_SECRET_KEY?.length);
    console.log("Received Token Length:", token.length);
    console.log("Received Token:", token);

    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!);
      console.log("[sellerAuth] OK — sellerId:", decoded?.id);
    } catch (err: any) {
      console.error("VERIFY FAILED");
      console.error({
        name: err?.name,
        message: err?.message,
        stack: err?.stack
      });
      return res.status(401).json({
        message: "JWT verification failed",
        reason: err?.message
      });
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