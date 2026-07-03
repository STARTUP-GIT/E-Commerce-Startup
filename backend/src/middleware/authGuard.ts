import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

const authToken = (req: Request) => {
  const customer = req.cookies?.customer_session;
  const seller = req.cookies?.seller_session;
  const admin = req.cookies?.admin_session;

  if (admin) return { token: admin, type: "admin" as const };
  if (seller) return { token: seller, type: "seller" as const };
  if (customer) return { token: customer, type: "customer" as const };

  const auth = req.headers.authorization;

  if (auth?.startsWith("Bearer ")) {
    return {
      token: auth.split(" ")[1],
      type: "admin" as const,
    };
  }

  return null;
};

const authGuard = async (
  req: Request & {
    adminId?: string;
    sellerId?: string;
    customerId?: string;
  },
  res: Response,
  next: NextFunction
) => {
  const auth = authToken(req);

  if (!auth) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const payload = jwt.verify(
      auth.token,
      process.env.JWT_SECRET_KEY!
    ) as { id: string };

    if (!payload?.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    switch (auth.type) {
      case "admin": {
        const admin = await prisma.admin.findUnique({
          where: { id: payload.id },
        });

        if (!admin || !admin.isActive) {
          return res.status(401).json({
            success: false,
            message: "Admin account disabled.",
          });
        }

        req.adminId = payload.id;
        break;
      }

      case "seller":
        req.sellerId = payload.id;
        break;

      case "customer":
        req.customerId = payload.id;
        break;
    }

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export default authGuard;