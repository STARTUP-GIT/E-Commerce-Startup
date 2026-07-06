import jwt from "jsonwebtoken";
import {prisma} from "../config/prisma.js";
import type { Request,Response,NextFunction } from "express";

export const sellerAuth = async (req : Request, res : Response, next : NextFunction) => {
  try {
    const token = req.cookies?.seller_session;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!);
    } catch (err) {
      return res.status(401).json({ message: "JWT verification failed" });
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