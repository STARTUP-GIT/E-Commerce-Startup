// =============================================================================
// FEATURE CONTROLLER — Platform owns every deployed feature.
// -----------------------------------------------------------------------------
// Features are defined in code (featureRegistry) and auto-registered on server
// startup. Platform does NOT create, edit, rollout, scope or delete features.
// The ONLY mutation available to Platform is toggling `enabled`.
// =============================================================================

import type { Request, Response } from "express";
import { prisma } from "../../../config/prisma.js";
import { auditRequest } from "../utils/auditLogger.js";
import {
  isFeatureEnabled,
  areFeaturesEnabled,
  clearFeatureCache,
  listRegisteredFeatures,
} from "../services/featureFlagService.js";

// ─── Read-only listing (registered/deployed features only) ───────────────────

export const listFeatureFlags = async (req: Request, res: Response) => {
  try {
    const { search, application } = req.query as Record<string, string | undefined>;

    let features = await listRegisteredFeatures();

    if (application) {
      const app = application.trim().toUpperCase();
      features = features.filter((f) => f.application === app);
    }

    if (search) {
      const needle = search.trim().toLowerCase();
      features = features.filter(
        (f) =>
          f.featureKey.toLowerCase().includes(needle) ||
          f.displayName.toLowerCase().includes(needle)
      );
    }

    return res.status(200).json({ features });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const getFeatureFlag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const feature = await prisma.feature.findUnique({ where: { id } });
    if (!feature) return res.status(404).json({ message: "Feature not found" });
    return res.status(200).json({ feature });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── The ONLY write operation: enable / disable a deployed feature ───────────

export const toggleFeatureFlag = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await prisma.feature.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Feature not found" });

    const { enabled } = req.body as { enabled?: boolean };
    const nextEnabled = typeof enabled === "boolean" ? enabled : !existing.enabled;

    const feature = await prisma.feature.update({
      where: { id },
      data: { enabled: nextEnabled },
    });

    clearFeatureCache(existing.application, existing.featureKey);

    await auditRequest(req, {
      userId: req.platformUserId,
      email: req.platformUser?.email,
      action: nextEnabled ? "FEATURE_ENABLED" : "FEATURE_DISABLED",
      module: "feature-flags",
      targetType: "Feature",
      targetId: feature.id,
      description: `${nextEnabled ? "Enabled" : "Disabled"} feature ${existing.application}:${existing.featureKey}`,
      previousValue: { enabled: existing.enabled },
      newValue: { enabled: feature.enabled },
    });

    return res
      .status(200)
      .json({ message: nextEnabled ? "Feature enabled" : "Feature disabled", feature });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

// ─── Engine evaluation endpoints ─────────────────────────────────────────────
// These reuse isFeatureEnabled() — the single helper shared with Customer and
// Seller frontends. Customer/Seller automatically receive the updated state
// whenever Platform toggles a switch (they read the latest DB value).

export const checkFlag = async (req: Request, res: Response) => {
  try {
    const key = String(req.query.key || "").trim().toUpperCase();
    if (!key) return res.status(400).json({ message: "key query parameter is required" });

    const application =
      typeof req.query.application === "string" && req.query.application.trim()
        ? req.query.application.trim().toUpperCase()
        : undefined;
    const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
    const shopId = typeof req.query.shopId === "string" ? req.query.shopId : undefined;

    const enabled = await isFeatureEnabled(key, { application, userId, shopId });
    return res.status(200).json({ key, enabled });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

export const checkFlagsBulk = async (req: Request, res: Response) => {
  try {
    const { keys, application } = req.body as { keys?: string[]; application?: string };
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ message: "keys array is required" });
    }
    const app =
      typeof application === "string" && application.trim()
        ? application.trim().toUpperCase()
        : undefined;
    const results = await areFeaturesEnabled(keys.map((k) => String(k).toUpperCase()), {
      application: app,
    });
    return res.status(200).json({ results });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};
