import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error", { error: err?.message || err, stack: err?.stack });
  const isProduction = process.env.NODE_ENV === "production";
  const status =
    err?.statusCode && err?.statusCode >= 400 && err?.statusCode < 600 ? err?.statusCode : 500;
  const message = isProduction ? "Internal Server Error" : err?.message || "Internal Server Error";
  res.status(status).json({ message });
};
