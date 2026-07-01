import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error", { error: err?.message || err, stack: err?.stack });
  const status = err?.statusCode || 500;
  const message = err?.message || "Internal Server Error";
  res.status(status).json({ message });
};
