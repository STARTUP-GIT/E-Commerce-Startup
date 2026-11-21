import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { getJwtSecret, verifyAccessToken } from "../config/token.js";
import { extractCandidateTokens } from "./tokenExtractor.js";

const authToken = (req: Request) => {
  const adminTokens = extractCandidateTokens(req, "admin_session");
  for (const token of adminTokens) {
    try {
      const payload = (verifyAccessToken(token) || jwt.verify(token, getJwtSecret())) as { id: string };
      if (payload?.id) return { token, type: "admin" as const, payload };
    } catch {}
  }

  const sellerTokens = extractCandidateTokens(req, "seller_session");
  for (const token of sellerTokens) {
    try {
      const payload = (verifyAccessToken(token) || jwt.verify(token, getJwtSecret())) as { id: string };
      if (payload?.id) return { token, type: "seller" as const, payload };
    } catch {}
  }

  const customerTokens = extractCandidateTokens(req, "customer_session");
  for (const token of customerTokens) {
    try {
      const payload = (verifyAccessToken(token) || jwt.verify(token, getJwtSecret())) as { id: string };
      if (payload?.id) return { token, type: "customer" as const, payload };
    } catch {}
  }

  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.split(" ")[1]?.trim();
    if (token) {
      try {
        const payload = (verifyAccessToken(token) || jwt.verify(token, getJwtSecret())) as { id: string };
        if (payload?.id) return { token, type: "bearer" as const, payload };
      } catch {}
    }
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
    const payload = auth.payload || (jwt.verify(
      auth.token,
      getJwtSecret()
    ) as { id: string });

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

      case "seller": {
        const seller = await prisma.seller.findUnique({
          where: { id: payload.id },
        });
        if (!seller || seller.isBanned || seller.isDeactivated) {
          return res.status(401).json({
            success: false,
            message: "Unauthorized",
          });
        }
        req.sellerId = payload.id;
        break;
      }

      case "customer": {
        const customer = await prisma.customer.findUnique({
          where: { id: payload.id },
        });
        if (!customer || customer.isBanned || customer.isDeactivated) {
          return res.status(401).json({
            success: false,
            message: "Unauthorized",
          });
        }
        req.customerId = payload.id;
        break;
      }

      // A raw Bearer token carries no type claim — resolve the identity from
      // the database instead of assuming "admin" (prevents privilege escalation).
      case "bearer": {
        const admin = await prisma.admin.findUnique({ where: { id: payload.id } });
        if (admin?.isActive) {
          req.adminId = payload.id;
          break;
        }
        const seller = await prisma.seller.findUnique({ where: { id: payload.id } });
        if (seller && !seller.isBanned && !seller.isDeactivated) {
          req.sellerId = payload.id;
          break;
        }
        const customer = await prisma.customer.findUnique({ where: { id: payload.id } });
        if (customer && !customer.isBanned && !customer.isDeactivated) {
          req.customerId = payload.id;
          break;
        }
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }
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