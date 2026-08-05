import type { Request, Response } from "express";
import { getPlatformSettings, getPlatformBranding, DEFAULT_PLATFORM_SETTINGS } from "../services/settingsService.js";
import { listRegisteredFeatures } from "../services/featureFlagService.js";

/**
 * GET /platform/layout/customer (and /api/platform/layout/customer)
 * Single source of truth layout payload for Customer Application.
 */
export const getCustomerLayout = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getPlatformSettings();
    const uiLayout = settings.uiLayout || DEFAULT_PLATFORM_SETTINGS.uiLayout;
    const branding = await getPlatformBranding();

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
    const branding = await getPlatformBranding();

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
 * Public branding payload (marketplace name, logo, favicon, logoUrl, faviconUrl).
 */
export const getBranding = async (_req: Request, res: Response): Promise<void> => {
  try {
    const branding = await getPlatformBranding();
    res.status(200).json(branding);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch Branding configuration" });
  }
};

/**
 * GET /api/platform/public/branding (and /platform/public/branding)
 * Public unauthenticated branding payload matching required schema:
 * { name, logo, favicon, updatedAt }
 */
export const getPublicBranding = async (_req: Request, res: Response): Promise<void> => {
  try {
    const branding = await getPlatformBranding();
    const logoVal = branding.logo || branding.logoUrl || "/images/logo.png";
    const faviconVal = branding.favicon || branding.faviconUrl || "/favicon.ico";
    res.status(200).json({
      name: branding.marketplaceName || "Marketplace",
      logo: logoVal,
      favicon: faviconVal,
      updatedAt: branding.updatedAt || new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch public branding" });
  }
};

/**
 * GET /api/platform/public/layout/customer-navbar
 * Returns the customer navbar configuration array.
 */
export const getCustomerNavbar = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getPlatformSettings();
    const uiLayout = settings.uiLayout || DEFAULT_PLATFORM_SETTINGS.uiLayout;
    const navbar = uiLayout.customerNavbar || DEFAULT_PLATFORM_SETTINGS.uiLayout.customerNavbar;
    res.status(200).json(navbar);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch customer navbar" });
  }
};

/**
 * GET /api/platform/public/layout/customer-homepage
 * Returns the customer homepage sections configuration array.
 */
export const getCustomerHomepage = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getPlatformSettings();
    const uiLayout = settings.uiLayout || DEFAULT_PLATFORM_SETTINGS.uiLayout;
    const homepageSections =
      uiLayout.customerHomepageSections || DEFAULT_PLATFORM_SETTINGS.uiLayout.customerHomepageSections;
    res.status(200).json(homepageSections);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch customer homepage sections" });
  }
};

/**
 * GET /api/platform/public/layout/seller-sidebar
 * Returns the seller sidebar configuration array.
 */
export const getSellerSidebar = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getPlatformSettings();
    const uiLayout = settings.uiLayout || DEFAULT_PLATFORM_SETTINGS.uiLayout;
    const sidebar = uiLayout.sellerSidebar || DEFAULT_PLATFORM_SETTINGS.uiLayout.sellerSidebar;
    res.status(200).json(sidebar);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch seller sidebar" });
  }
};

/**
 * GET /api/platform/public/layout/seller-widgets
 * Returns the seller dashboard widgets configuration array.
 */
export const getSellerWidgets = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getPlatformSettings();
    const uiLayout = settings.uiLayout || DEFAULT_PLATFORM_SETTINGS.uiLayout;
    const widgets =
      uiLayout.sellerDashboardWidgets || DEFAULT_PLATFORM_SETTINGS.uiLayout.sellerDashboardWidgets;
    res.status(200).json(widgets);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch seller widgets" });
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

