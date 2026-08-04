// =============================================================================
// FEATURE FLAG ENGINE
// -----------------------------------------------------------------------------
// The single source of truth for evaluating feature flags.
//
//   isFeatureEnabled("BUY_NOW")      -> Promise<boolean>
//
// Used by BOTH the backend and (through the /engine/check endpoint) the
// frontend. Never hardcode `if (true)` / `if (false)` anywhere — always route
// through this helper.
//
// Evaluation rules:
//   1. Unknown flag            -> false
//   2. status = SCHEDULED      -> enabled only inside [startsAt, endsAt]
//   3. status = DISABLED       -> false
//   4. targetEnvironment match -> false if flag pinned to another env
//   5. rolloutPercentage       -> deterministic bucketing using a stable
//      hash of key + scope identifier (userId/shopId for USER/SHOP scopes)
// =============================================================================

import { prisma } from "../../../config/prisma.js";
import type { FeatureFlag, FeatureFlagStatus, FeatureFlagScope } from "@prisma/client";
import crypto from "crypto";

interface EvaluateOptions {
  /** Stable identifier used for USER / SHOP scoped rollout bucketing. */
  userId?: string;
  shopId?: string;
  /** Current environment, e.g. "production" | "staging" | "development". */
  environment?: string;
  /** A seed that overrides the default bucketing input. */
  seed?: string;
}

export const DEFAULT_ENVIRONMENT = process.env.NODE_ENV || "development";

// ── Small in-memory cache (30s) to keep DB pressure low ───────────────────────
interface CacheEntry {
  expiresAt: number;
  flag: FeatureFlag | null;
}
const CACHE_TTL_MS = 30 * 1000;
const flagCache = new Map<string, CacheEntry>();

export const clearFeatureFlagCache = (key?: string): void => {
  if (key) {
    flagCache.delete(normalizeCacheKey(key));
    return;
  }
  flagCache.clear();
};

const normalizeCacheKey = (key: string) => key.trim().toUpperCase();

const getCached = (cacheKey: string): FeatureFlag | null | undefined => {
  const entry = flagCache.get(cacheKey);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    flagCache.delete(cacheKey);
    return undefined;
  }
  return entry.flag;
};

const setCached = (cacheKey: string, flag: FeatureFlag | null): void => {
  flagCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, flag });
};

const fetchFlag = async (key: string): Promise<FeatureFlag | null> => {
  const cacheKey = normalizeCacheKey(key);
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  const flag = await prisma.featureFlag.findUnique({ where: { key: cacheKey } });
  setCached(cacheKey, flag);
  return flag;
};

// Deterministic stable hash bucketing (0-99) — no Math.random, so the same
// user/scope always lands in the same bucket for the same key.
const stableBucket = (input: string): number => {
  const hash = crypto.createHash("sha256").update(input).digest();
  return hash[0] % 100;
};

const statusAllows = (status: FeatureFlagStatus): boolean =>
  status === "ENABLED" || status === "BETA" || status === "INTERNAL";

const isWithinSchedule = (flag: FeatureFlag): boolean => {
  const now = Date.now();
  if (flag.startsAt && now < flag.startsAt.getTime()) return false;
  if (flag.endsAt && now > flag.endsAt.getTime()) return false;
  return true;
};

const scopeIdentifier = (scope: FeatureFlagScope, opts: EvaluateOptions): string | null => {
  switch (scope) {
    case "USER":
      return opts.userId || null;
    case "SHOP":
      return opts.shopId || null;
    case "CUSTOMER":
      return opts.userId || null;
    default:
      return null;
  }
};

/**
 * Core evaluation helper. Reused by the backend and exposed to frontends via
 * GET /api/platform/feature-flags/engine/check.
 */
export const isFeatureEnabled = async (
  key: string,
  opts: EvaluateOptions = {}
): Promise<boolean> => {
  const flag = await fetchFlag(key);
  if (!flag) return false;

  if (!flag.enabled) return false;

  if (flag.status === "SCHEDULED") {
    if (!isWithinSchedule(flag)) return false;
  } else if (flag.status === "DISABLED") {
    return false;
  } else if (flag.status === "DEPRECATED") {
    // Deprecated features may keep serving until the flag is deleted.
  } else if (!statusAllows(flag.status)) {
    return false;
  }

  if (flag.targetEnvironment) {
    const env = (opts.environment || DEFAULT_ENVIRONMENT).toLowerCase();
    if (flag.targetEnvironment.toLowerCase() !== env) return false;
  }

  if (flag.rolloutPercentage <= 0) return false;
  if (flag.rolloutPercentage >= 100) return true;

  const id = scopeIdentifier(flag.scope, opts);
  const seed = opts.seed || id || "global";
  return stableBucket(`${flag.key}:${seed}`) < flag.rolloutPercentage;
};

/** Bulk evaluation — returns a map of key -> boolean. */
export const areFeaturesEnabled = async (
  keys: string[],
  opts: EvaluateOptions = {}
): Promise<Record<string, boolean>> => {
  const results: Record<string, boolean> = {};
  for (const key of keys) {
    results[key] = await isFeatureEnabled(key, opts);
  }
  return results;
};

export interface FeatureFlagSummary {
  key: string;
  type: string;
  enabled: boolean;
  status: FeatureFlagStatus;
  scope: FeatureFlagScope;
  rolloutPercentage: number;
  targetEnvironment: string | null;
}

/** Full public definition without evaluation (used by management UI). */
export const getFeatureFlagByKey = async (key: string): Promise<FeatureFlag | null> =>
  fetchFlag(key);
