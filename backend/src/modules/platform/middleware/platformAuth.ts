// =============================================================================
// PLATFORM AUTH MIDDLEWARE
// -----------------------------------------------------------------------------
// Verifies the `platform_session` JWT, loads the PlatformUser with its role and
// permissions. Admin app users DO NOT get platform access — only rows in the
// `platform_users` table can authenticate here.
// =============================================================================

import type { Request, Response, NextFunction } from "express";
import { prisma } from "../../../config/prisma.js";
import jwt from "jsonwebtoken";
import type { PlatformUser } from "@prisma/client";

interface JwtPayload {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      platformUserId?: string;
      platformUser?: PlatformUser;
      platformPermissions?: string[];
      platformRoleName?: string | null;
      platformIsOwner?: boolean;
    }
  }
}

export const platformAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined =
      typeof req.cookies?.platform_session === "string" ? req.cookies.platform_session : undefined;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY!) as JwtPayload;

    const user = await prisma.platformUser.findUnique({
      where: { id: decoded.id },
      include: { role: { include: { permissions: true } } },
    });

    if (!user) {
      return res.status(401).json({ message: "Platform user not found" });
    }
    if (user.status !== "ACTIVE") {
      return res.status(403).json({ message: "Platform user is disabled" });
    }

    req.platformUserId = user.id;
    req.platformUser = user;
    req.platformRoleName = user.role?.name || null;
    req.platformIsOwner = user.isOwner || user.role?.type === "OWNER";
    req.platformPermissions = user.role?.permissions.map((p) => p.key) || [];

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/** Factory middleware — denies requests lacking a permission key. */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.platformUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.platformIsOwner) {
      return next();
    }
    if (req.platformPermissions?.includes(permission)) {
      return next();
    }
    return res.status(403).json({ message: `Forbidden: missing permission '${permission}'` });
  };
};

/** Guard for OWNER-only routes (e.g. deleting system roles). */
export const requireOwner = (req: Request, res: Response, next: NextFunction) => {
  if (!req.platformUserId) return res.status(401).json({ message: "Unauthorized" });
  if (req.platformIsOwner) return next();
  return res.status(403).json({ message: "Forbidden: Platform Owner access required" });
};
