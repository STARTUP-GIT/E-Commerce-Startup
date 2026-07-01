import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";
import { requestStore } from "./requestStore.js";
import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const { method, originalUrl, ip, headers } = req;
  const requestId = crypto.randomUUID();
  req.id = requestId;

  requestStore.run({ requestId }, () => {
    logger.info("Incoming request", {
      method,
      path: originalUrl,
      ip,
      userAgent: headers["user-agent"] || "unknown",
      contentType: headers["content-type"] || "unknown"
    });
    next();
  });
};
