// =============================================================================
// FEATURE FLAG CONTROLLER — the most important Platform module.
// =============================================================================

import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { auditRequest } from "../utils/auditLogger.js";
import {
  isFeatureEnabled,
  areFeaturesEnabled,
  clearFeatureFlagCache,
} from "../services/featureFlagService.js";
import { featureTypeToEnum, FEATURE_FLAG_TYPES, FEATURE_FLAG_STATUSES, FEATURE_FLAG_SCOPES } from "../utils/constants.js";

const toEnum = (value: string, fallback: string, allowed: readonly string[]): string => {
  const normalized = featureTypeToEnum(value);
  return allowed.includes(normalized as any) ? normalized : fallback;
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const listFeatureFlags = async (req: Request, res: Response) => {
  try {
    const { status, scope, type, search } = req.query as Record<string, string | undefined>;
    const flags = await prisma.featureFlag.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(scope ? { scope: scope as any } : {}),
        ...(type ? { type: toEnum(type, "BUY_NOW", FEATURE_FLAG_TYPES) as any } : {}),
        ...(search
          ? { OR: [{ key: { contains: search, mode: "insensitive" } }, { displayName: { contains: search, mode: "insensitive" } }] }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ flags });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const getFeatureFlag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const flag = await prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) return res.status(404).json({ message: "Feature flag not found" });
    return res.status(200).json({ flag });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const createFeatureFlag = async (req: Request, res: Response) => {
  try {
    const { key, type, displayName, description, status, scope, rolloutPercentage, targetEnvironment, scheduledAt, startsAt, endsAt, metadata } = req.body;

    if (!key || !displayName || !type) {
      return res.status(400).json({ message: "key, displayName, and type are required" });
    }

    const normalizedKey = String(key).trim().toUpperCase();
    const existing = await prisma.featureFlag.findUnique({ where: { key: normalizedKey } });
    if (existing) {
      return res.status(409).json({ message: `Feature flag '${normalizedKey}' already exists` });
    }

    const flag = await prisma.featureFlag.create({
      data: {
        key: normalizedKey,
        type: toEnum(type, "BUY_NOW", FEATURE_FLAG_TYPES) as any,
        displayName: String(displayName),
        description: description ? String(description) : null,
        enabled: status === "ENABLED" || status === "INTERNAL" || status === "BETA",
        status: toEnum(status || "DISABLED", "DISABLED", FEATURE_FLAG_STATUSES) as any,
        scope: toEnum(scope || "GLOBAL", "GLOBAL", FEATURE_FLAG_SCOPES) as any,
        rolloutPercentage: Number.isFinite(Number(rolloutPercentage)) ? Number(rolloutPercentage) : 100,
        targetEnvironment: targetEnvironment ? String(targetEnvironment) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        metadata: metadata ?? undefined,
        createdBy: req.platformUser?.email || null,
        updatedBy: req.platformUser?.email || null,
      },
    });

    clearFeatureFlagCache(normalizedKey);

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "FEATURE_FLAG_CREATED",
      module: "feature-flags",
      targetType: "FeatureFlag",
      targetId: flag.id,
      description: `Created feature flag ${flag.key}`,
      newValue: { key: flag.key, type: flag.type, status: flag.status, scope: flag.scope, rolloutPercentage: flag.rolloutPercentage },
    });

    return res.status(201).json({ message: "Feature flag created successfully", flag });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateFeatureFlag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.featureFlag.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Feature flag not found" });

    const { displayName, description, status, scope, rolloutPercentage, targetEnvironment, scheduledAt, startsAt, endsAt, metadata } = req.body;

    const nextStatus = status !== undefined ? toEnum(status, existing.status, FEATURE_FLAG_STATUSES) : existing.status;
    const nextScope = scope !== undefined ? toEnum(scope, existing.scope, FEATURE_FLAG_SCOPES) : existing.scope;
    const nextRollout = rolloutPercentage !== undefined && Number.isFinite(Number(rolloutPercentage)) ? Number(rolloutPercentage) : existing.rolloutPercentage;

    const flag = await prisma.featureFlag.update({
      where: { id },
      data: {
        ...(displayName !== undefined ? { displayName: String(displayName) } : {}),
        ...(description !== undefined ? { description: description ? String(description) : null } : {}),
        ...(status !== undefined ? { status: nextStatus as any } : {}),
        ...(scope !== undefined ? { scope: nextScope as any } : {}),
        ...(rolloutPercentage !== undefined ? { rolloutPercentage: nextRollout } : {}),
        ...(targetEnvironment !== undefined ? { targetEnvironment: targetEnvironment ? String(targetEnvironment) : null } : {}),
        ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}),
        ...(startsAt !== undefined ? { startsAt: startsAt ? new Date(startsAt) : null } : {}),
        ...(endsAt !== undefined ? { endsAt: endsAt ? new Date(endsAt) : null } : {}),
        ...(metadata !== undefined ? { metadata } : {}),
        enabled:
          status !== undefined
            ? nextStatus === "ENABLED" || nextStatus === "INTERNAL" || nextStatus === "BETA"
            : existing.enabled,
        updatedBy: req.platformUser?.email || null,
      },
    });

    clearFeatureFlagCache(flag.key);

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "FEATURE_FLAG_UPDATED",
      module: "feature-flags",
      targetType: "FeatureFlag",
      targetId: flag.id,
      description: `Updated feature flag ${flag.key}`,
      previousValue: {
        status: existing.status,
        scope: existing.scope,
        rolloutPercentage: existing.rolloutPercentage,
        enabled: existing.enabled,
      },
      newValue: { status: flag.status, scope: flag.scope, rolloutPercentage: flag.rolloutPercentage, enabled: flag.enabled },
    });

    return res.status(200).json({ message: "Feature flag updated successfully", flag });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const deleteFeatureFlag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.featureFlag.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Feature flag not found" });

    await prisma.featureFlag.delete({ where: { id } });
    clearFeatureFlagCache(existing.key);

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "FEATURE_FLAG_DELETED",
      module: "feature-flags",
      targetType: "FeatureFlag",
      targetId: existing.id,
      description: `Deleted feature flag ${existing.key}`,
      previousValue: { key: existing.key, type: existing.type, status: existing.status },
    });

    return res.status(200).json({ message: "Feature flag deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── Toggle / Rollout ────────────────────────────────────────────────────────

export const toggleFeatureFlag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.featureFlag.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Feature flag not found" });

    const { enabled } = req.body as { enabled?: boolean };
    const nextEnabled = typeof enabled === "boolean" ? enabled : !existing.enabled;

    const flag = await prisma.featureFlag.update({
      where: { id },
      data: {
        enabled: nextEnabled,
        status: nextEnabled && existing.status === "DISABLED" ? "ENABLED" : existing.status,
        updatedBy: req.platformUser?.email || null,
      },
    });

    clearFeatureFlagCache(flag.key);

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: nextEnabled ? "FEATURE_FLAG_ENABLED" : "FEATURE_FLAG_DISABLED",
      module: "feature-flags",
      targetType: "FeatureFlag",
      targetId: flag.id,
      description: `${nextEnabled ? "Enabled" : "Disabled"} feature flag ${flag.key}`,
      previousValue: { enabled: existing.enabled, status: existing.status },
      newValue: { enabled: flag.enabled, status: flag.status },
    });

    return res.status(200).json({ message: nextEnabled ? "Feature flag enabled" : "Feature flag disabled", flag });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const updateRollout = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.featureFlag.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Feature flag not found" });

    const { rolloutPercentage } = req.body;
    const next = Math.max(0, Math.min(100, Number(rolloutPercentage)));
    if (!Number.isFinite(next)) {
      return res.status(400).json({ message: "rolloutPercentage must be a number" });
    }

    const flag = await prisma.featureFlag.update({
      where: { id },
      data: { rolloutPercentage: next, updatedBy: req.platformUser?.email || null },
    });

    clearFeatureFlagCache(flag.key);

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: "FEATURE_FLAG_ROLLOUT_UPDATED",
      module: "feature-flags",
      targetType: "FeatureFlag",
      targetId: flag.id,
      description: `Set rollout of ${flag.key} to ${next}%`,
      previousValue: { rolloutPercentage: existing.rolloutPercentage },
      newValue: { rolloutPercentage: next },
    });

    return res.status(200).json({ message: "Rollout updated successfully", flag });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── Engine evaluation endpoints ─────────────────────────────────────────────
// These reuse isFeatureEnabled() — the single helper shared with frontends.

export const checkFlag = async (req: Request, res: Response) => {
  try {
    const key = String(req.query.key || "").trim().toUpperCase();
    if (!key) return res.status(400).json({ message: "key query parameter is required" });

    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const shopId = typeof req.query.shopId === "string" ? req.query.shopId : undefined;
    const environment = typeof req.query.environment === "string" ? req.query.environment : undefined;

    const enabled = await isFeatureEnabled(key, { userId, shopId, environment });
    return res.status(200).json({ key, enabled });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const checkFlagsBulk = async (req: Request, res: Response) => {
  try {
    const { keys } = req.body as { keys?: string[] };
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ message: "keys array is required" });
    }
    const results = await areFeaturesEnabled(keys.map((k) => String(k).toUpperCase()));
    return res.status(200).json({ results });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── Catalog metadata for the UI ─────────────────────────────────────────────

export const getFlagCatalog = async (_req: Request, res: Response) => {
  try {
    return res.status(200).json({
      types: FEATURE_FLAG_TYPES,
      statuses: FEATURE_FLAG_STATUSES,
      scopes: FEATURE_FLAG_SCOPES,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── Default seeding (BUY_NOW, AI_SEARCH, LIVE_TRACKING examples) ────────────

export const ensureDefaultFeatureFlags = async (): Promise<void> => {
  try {
    const seed: { key: string; type: string; displayName: string; description: string; enabled: boolean; status: string; scope: string; rolloutPercentage: number }[] = [
      { key: "BUY_NOW", type: "BUY_NOW", displayName: "Buy Now", description: "Allow customers to purchase instantly from the product page.", enabled: true, status: "ENABLED", scope: "GLOBAL", rolloutPercentage: 100 },
      { key: "AI_SEARCH", type: "AI_SEARCH", displayName: "AI Search", description: "AI-powered product search. Currently disabled.", enabled: false, status: "DISABLED", scope: "GLOBAL", rolloutPercentage: 0 },
      { key: "LIVE_TRACKING", type: "LIVE_TRACKING", displayName: "Live Tracking", description: "Real-time delivery tracking visible to sellers.", enabled: true, status: "ENABLED", scope: "SELLER", rolloutPercentage: 15 },
    ];

    for (const item of seed) {
      const existing = await prisma.featureFlag.findUnique({ where: { key: item.key } });
      if (!existing) {
        await prisma.featureFlag.create({
          data: {
            key: item.key,
            type: toEnum(item.type, "BUY_NOW", FEATURE_FLAG_TYPES) as any,
            displayName: item.displayName,
            description: item.description,
            enabled: item.enabled,
            status: toEnum(item.status, "DISABLED", FEATURE_FLAG_STATUSES) as any,
            scope: toEnum(item.scope, "GLOBAL", FEATURE_FLAG_SCOPES) as any,
            rolloutPercentage: item.rolloutPercentage,
          },
        });
      }
    }
    console.log("[platform] Default feature flags ensured.");
  } catch (error) {
    console.error("[platform] Failed to seed default feature flags:", error);
  }
};
