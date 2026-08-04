import type { Request, Response, NextFunction } from "express";
import { isFeatureEnabled } from "../modules/platform/services/featureFlagService.js";

/**
 * Feature Guard Middleware
 * Protects backend routes by checking Platform feature flags.
 *
 * Example:
 * router.post("/buy-now", requireFeature("BUY_NOW", "CUSTOMER"), buyNowHandler);
 */
export const requireFeature = (
  featureKey: string,
  application: "CUSTOMER" | "SELLER" = "CUSTOMER"
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const enabled = await isFeatureEnabled(featureKey, { application });
      if (!enabled) {
        res.status(403).json({
          error: `Feature '${featureKey}' is currently disabled by Platform.`,
          featureKey,
          application,
          enabled: false,
        });
        return;
      }
      next();
    } catch (error: any) {
      console.error(`[featureGuard] Error checking feature ${featureKey}:`, error);
      // In case of error, proceed safely or reject based on fail-open/fail-closed policy. Next() preserves availability.
      next();
    }
  };
};
