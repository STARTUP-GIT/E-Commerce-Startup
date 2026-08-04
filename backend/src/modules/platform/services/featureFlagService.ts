// =============================================================================
// FEATURE ENGINE
// -----------------------------------------------------------------------------
// Single source of truth for evaluating features:
//
//   isFeatureEnabled("BUY_NOW", { application: "CUSTOMER" }) -> Promise<boolean>
//
// Used by the backend and exposed to frontends via the /engine/check endpoints.
//
// Evaluation rules:
//   1. Feature must be REGISTERED in code (deployed) -> otherwise false
//   2. Unknown / not yet registered feature           -> false
//   3. `enabled === true` on the Feature record       -> true
//
// Platform never creates or deletes features. On server startup
// syncFeatureDefinitions() inserts any registered feature that is missing from
// the database, leaving the `enabled` state of existing rows untouched.
// =============================================================================

import { prisma } from "../../../config/prisma.js";
import { FEATURE_DEFINITIONS, isFeatureRegistered } from "./featureRegistry.js";
import type { Feature } from "@prisma/client";

interface EvaluateOptions {
  /** Owning application, e.g. "CUSTOMER" | "SELLER". */
  application?: string;
  /** Kept for forward compatibility (user-scoped consumers). */
  userId?: string;
  /** Kept for forward compatibility (shop-scoped consumers). */
  shopId?: string;
}

// ── Small in-memory cache (30s) to keep DB pressure low ───────────────────────
interface CacheEntry {
  expiresAt: number;
  value: Feature | null;
}
const CACHE_TTL_MS = 30 * 1000;
const featureCache = new Map<string, CacheEntry>();

export const clearFeatureCache = (application?: string, featureKey?: string): void => {
  if (application && featureKey) {
    featureCache.delete(cacheKeyOf(application, featureKey));
    return;
  }
  if (featureKey) {
    for (const key of featureCache.keys()) {
      if (key.endsWith(`:${featureKey.toUpperCase()}`)) featureCache.delete(key);
    }
    return;
  }
  featureCache.clear();
};

const cacheKeyOf = (application: string, featureKey: string): string =>
  `${String(application).toUpperCase()}:${String(featureKey).toUpperCase()}`;

const getCached = (cacheKey: string): Feature | null | undefined => {
  const entry = featureCache.get(cacheKey);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    featureCache.delete(cacheKey);
    return undefined;
  }
  return entry.value;
};

const setCached = (cacheKey: string, feature: Feature | null): void => {
  featureCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: feature });
};

const fetchFeature = async (application: string, featureKey: string): Promise<Feature | null> => {
  const cacheKey = cacheKeyOf(application, featureKey);
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  const feature = await prisma.feature.findUnique({
    where: { featureKey_application: { featureKey, application } },
  });
  setCached(cacheKey, feature);
  return feature;
};

/**
 * Core evaluation helper. Reused by the backend and exposed to frontends via
 * GET/POST /api/platform/feature-flags/engine/check.
 */
export const isFeatureEnabled = async (
  key: string,
  opts: EvaluateOptions = {}
): Promise<boolean> => {
  const featureKey = String(key).trim().toUpperCase();
  if (!featureKey) return false;

  const application = opts.application?.trim().toUpperCase();

  let feature: Feature | null;
  if (application) {
    // Not deployed (not registered in code) -> never enabled.
    if (!isFeatureRegistered(application, featureKey)) return false;
    feature = await fetchFeature(application, featureKey);
  } else {
    // No application context: match any application that has this key.
    const cacheKey = `*:${featureKey}`;
    const cached = getCached(cacheKey);
    if (cached !== undefined) {
      feature = cached;
    } else {
      const rows = await prisma.feature.findMany({ where: { featureKey } });
      feature = rows.length > 0 ? (rows[0] as Feature) : null;
      setCached(cacheKey, feature);
    }
  }

  return feature?.enabled === true;
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

/**
 * Only REGISTERED (deployed) features are ever shown in Platform. Stale rows
 * that are no longer in the registry are excluded but never deleted.
 */
export const listRegisteredFeatures = async (): Promise<Feature[]> => {
  const rows = await prisma.feature.findMany({
    orderBy: [{ application: "asc" }, { featureKey: "asc" }],
  });
  return rows.filter((row) => isFeatureRegistered(row.application, row.featureKey));
};

/**
 * Automatic feature synchronization.
 *
 * On server startup, load the code-defined registry and compare it with the
 * database. Insert any missing features. Existing records are NEVER deleted
 * and their `enabled` state is NEVER touched.
 */
export const syncFeatureDefinitions = async (): Promise<{
  inserted: number;
  existing: number;
}> => {
  const rows = await prisma.feature.findMany({
    select: { featureKey: true, application: true },
  });
  const existingKeys = new Set(
    rows.map((row) => cacheKeyOf(row.application, row.featureKey))
  );

  const missing = FEATURE_DEFINITIONS.filter(
    (def) => !existingKeys.has(cacheKeyOf(def.application, def.featureKey))
  );

  if (missing.length === 0) {
    console.log(
      `[platform] Feature registry synchronized — ${rows.length} feature(s) present, none missing.`
    );
    return { inserted: 0, existing: rows.length };
  }

  await prisma.feature.createMany({
    data: missing.map((def) => ({
      featureKey: def.featureKey,
      application: def.application,
      displayName: def.displayName,
      enabled: def.enabled ?? false,
    })),
  });

  console.log(
    `[platform] Registered ${missing.length} new feature(s): ${missing
      .map((def) => `${def.application}:${def.featureKey}`)
      .join(", ")}`
  );
  return { inserted: missing.length, existing: rows.length };
};
