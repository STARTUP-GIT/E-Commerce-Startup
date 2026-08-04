// =============================================================================
// AUDIT LOGGER — every Platform action must create an audit trail entry.
// =============================================================================

import { prisma } from "../../../config/prisma.js";
import type { Request } from "express";

export interface AuditParams {
  userId?: string;
  email?: string;
  action: string;
  module: string;
  targetType: string;
  targetId?: string;
  description: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export const serialize = (value: unknown): unknown => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value ?? null);
  }
};

export const logAuditTrail = async (params: AuditParams): Promise<void> => {
  try {
    await prisma.auditTrail.create({
      data: {
        userId: params.userId || null,
        email: params.email || null,
        action: params.action,
        module: params.module,
        targetType: params.targetType,
        targetId: params.targetId || null,
        description: params.description,
        previousValue: params.previousValue !== undefined ? (serialize(params.previousValue) as any) : undefined,
        newValue: params.newValue !== undefined ? (serialize(params.newValue) as any) : undefined,
        metadata: params.metadata !== undefined ? (serialize(params.metadata) as any) : undefined,
      },
    });
  } catch (error) {
    console.error("FAILED TO WRITE AUDIT TRAIL:", error);
  }
};

/** Convenience wrapper that extracts user/IP context from an Express request. */
export const auditRequest = async (
  req: Request,
  params: Omit<AuditParams, "ipAddress" | "userAgent"> & {
    userId?: string;
    email?: string;
  }
): Promise<void> => {
  await logAuditTrail({
    ...params,
    ipAddress: req.ip || req.socket?.remoteAddress || undefined,
    userAgent: req.headers["user-agent"] || undefined,
  });
};
