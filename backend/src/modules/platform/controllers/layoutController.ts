import type { Request, Response } from "express";
import { getPlatformSettings, DEFAULT_PLATFORM_SETTINGS } from "../services/settingsService.js";
import { listRegisteredFeatures } from "../services/featureFlagService.js";

/**
 * GET /platform/layout/customer (and /api/platform/layout/customer)
 * Single source of truth layout payload for Customer Application.
 */
export const getCustomerLayout = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getPlatformSettings();
    const uiLayout = settings.uiLayout || DEFAULT_PLATFORM_SETTINGS.uiLayout;
    const branding = settings.branding || DEFAULT_PLATFORM_SETTINGS.branding;

    const allFeatures = await listRegisteredFeatures();
    const customerFeatures: Record<string, boolean> = {};

    for (const feat of allFeatures) {
      if (feat.application === "CUSTOMER") {
        customerFeatures[feat.featureKey] = feat.enabled;
      }
    }

    res.status(200).json({
      navbar: uiLayout.customerNavbar || DEFAULT_PLATFORM_SETTINGS.uiLayout.customerNavbar,
      homepageSections:
        uiLayout.customerHomepageSections ||
        DEFAULT_PLATFORM_SETTINGS.uiLayout.customerHomepageSections,
      footer: uiLayout.customerFooter || DEFAULT_PLATFORM_SETTINGS.uiLayout.customerFooter,
      categoriesLayout:
        uiLayout.customerCategoriesLayout ||
        DEFAULT_PLATFORM_SETTINGS.uiLayout.customerCategoriesLayout,
      features: customerFeatures,
      branding,
      synced: true,
      updatedAt: uiLayout.syncedAt || new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch Customer layout" });
  }
};

/**
 * GET /platform/layout/seller (and /api/platform/layout/seller)
 * Single source of truth layout payload for Seller Application.
 */
export const getSellerLayout = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getPlatformSettings();
    const uiLayout = settings.uiLayout || DEFAULT_PLATFORM_SETTINGS.uiLayout;
    const branding = settings.branding || DEFAULT_PLATFORM_SETTINGS.branding;

    const allFeatures = await listRegisteredFeatures();
    const sellerFeatures: Record<string, boolean> = {};

    for (const feat of allFeatures) {
      if (feat.application === "SELLER") {
        sellerFeatures[feat.featureKey] = feat.enabled;
      }
    }

    res.status(200).json({
      sidebar: uiLayout.sellerSidebar || DEFAULT_PLATFORM_SETTINGS.uiLayout.sellerSidebar,
      dashboardWidgets:
        uiLayout.sellerDashboardWidgets ||
        DEFAULT_PLATFORM_SETTINGS.uiLayout.sellerDashboardWidgets,
      quickActions:
        uiLayout.sellerQuickActions || DEFAULT_PLATFORM_SETTINGS.uiLayout.sellerQuickActions,
      dashboardCards:
        uiLayout.sellerDashboardCards || DEFAULT_PLATFORM_SETTINGS.uiLayout.sellerDashboardCards,
      features: sellerFeatures,
      branding,
      synced: true,
      updatedAt: uiLayout.syncedAt || new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch Seller layout" });
  }
};

/**
 * GET /platform/branding (and /api/platform/branding)
 * Public branding payload (marketplace name, logo, favicon).
 */
export const getBranding = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getPlatformSettings();
    const branding = settings.branding || DEFAULT_PLATFORM_SETTINGS.branding;

    res.status(200).json(branding);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch Branding configuration" });
  }
};

/**
 * GET /platform/features (and /api/platform/features)
 * Evaluated feature map for Customer and Seller applications.
 */
export const getPublicFeatures = async (_req: Request, res: Response): Promise<void> => {
  try {
    const allFeatures = await listRegisteredFeatures();
    const result: {
      CUSTOMER: Record<string, boolean>;
      SELLER: Record<string, boolean>;
    } = {
      CUSTOMER: {},
      SELLER: {},
    };

    for (const feat of allFeatures) {
      if (feat.application === "CUSTOMER") {
        result.CUSTOMER[feat.featureKey] = feat.enabled;
      } else if (feat.application === "SELLER") {
        result.SELLER[feat.featureKey] = feat.enabled;
      }
    }

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch feature status" });
  }
};
