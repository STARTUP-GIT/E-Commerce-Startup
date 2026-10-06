import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";

const getSafeErrorMessage = (error: unknown): string => {
  const fallback = "Something went wrong. Please try again later.";

  if (error instanceof Error && error.message) {
    const normalized = error.message.replace(/\s+/g, " ").trim();
    if (!normalized) return fallback;

    const exposesPrismaError = /Invalid `prisma\.|PrismaClientKnownRequestError|P2002|P2025|P1001|PostgreSQL|column .* does not exist|database error|stack trace/i.test(normalized);
    if (exposesPrismaError) {
      return fallback;
    }

    return normalized;
  }

  if (typeof error === "string" && error.trim()) {
    const normalized = error.trim().replace(/\s+/g, " ");
    if (/Invalid `prisma\.|PrismaClientKnownRequestError|P2002|P2025|P1001|PostgreSQL|column .* does not exist|database error|stack trace/i.test(normalized)) {
      return fallback;
    }
    return normalized;
  }

  return fallback;
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error", { error: err?.message || err, stack: err?.stack });
  const status =
    err?.statusCode && err?.statusCode >= 400 && err?.statusCode < 600 ? err?.statusCode : 500;
  const message = getSafeErrorMessage(err);
  res.status(status).json({ message });
};
