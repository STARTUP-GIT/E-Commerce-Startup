import jwt from "jsonwebtoken";
import {prisma} from "../config/prisma.js";
import type { Request,Response,NextFunction } from "express";

export const sellerAuth = async (req : Request, res : Response, next : NextFunction) => {
  try {
    console.log("========== SELLER AUTH ==========");
    console.log("Cookies:", req.cookies);

    const token = req.cookies?.seller_session;

    if (!token) {
      console.log("No seller_session cookie");
      return res.status(401).json({ message: "Cookie missing" });
    }

    console.log("Token:", token);

    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!);
      console.log("Decoded JWT:", decoded);
    } catch (err) {
      console.error("JWT VERIFY FAILED:", err);
      return res.status(401).json({ message: "JWT verification failed" });
    }

    const seller = await prisma.seller.findUnique({
      where: {
        id: decoded.id,
      },
    });

    console.log("Seller from DB:", seller);

    if (!seller) {
      return res.status(401).json({
        message: "Seller not found",
        sellerId: decoded.id,
      });
    }

    req.sellerId = seller.id;

    console.log("Authentication successful");

    next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Auth middleware crashed",
      error: String(err),
    });
  }
};