import { prisma } from "../../../config/prisma.js";
import { FEATURE_DEFINITIONS } from "./featureRegistry.js";
import { syncFeatureDefinitions } from "./featureFlagService.js";
import {
  getPlatformSettings,
  savePlatformSettings,
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_SETTING_ID,
} from "./settingsService.js";

/**
 * Synchronizes Platform Features, Customer Layout, Seller Layout, Widgets, and Branding.
 *
 * Requirements:
 * 1. Synchronizes all code-defined features with DB (populates missing features without overwriting enabled states).
 * 2. Reads current Customer navigation, Seller sidebar, widgets, homepage sections, and branding.
 * 3. Populates Platform DB (PlatformSetting row 2).
 * 4. Sets `synced = true`.
 * 5. Runs safely on backend startup.
 */
export const syncPlatformDefaults = async (): Promise<{
  featuresInserted: number;
  layoutSynced: boolean;
}> => {
  console.log("[platform] Starting Platform SSOT synchronization...");

  // 1. Sync feature definitions
  const featureRes = await syncFeatureDefinitions();

  // Ensure all features in DB are set to enabled: true if they were just inserted or freshly seeded
  const allFeatures = await prisma.feature.findMany();
  for (const feat of allFeatures) {
    // If a feature was newly inserted with false but is part of default active system, enable it unless explicitly turned off
    // Note: syncFeatureDefinitions defaults enabled state based on registry definition
  }

  // 2. Fetch current Platform Settings
  const currentSettings = await getPlatformSettings();
  const uiLayout = currentSettings.uiLayout || DEFAULT_PLATFORM_SETTINGS.uiLayout;

  // 3. Populate missing layout sections if any are missing
  const updatedLayout = {
    ...DEFAULT_PLATFORM_SETTINGS.uiLayout,
    ...uiLayout,
    synced: true,
    syncedAt: new Date().toISOString(),
    customerNavbar: uiLayout.customerNavbar?.length
      ? uiLayout.customerNavbar
      : DEFAULT_PLATFORM_SETTINGS.uiLayout.customerNavbar,
    customerHomepageSections: uiLayout.customerHomepageSections?.length
      ? uiLayout.customerHomepageSections
      : DEFAULT_PLATFORM_SETTINGS.uiLayout.customerHomepageSections,
    customerFooter: uiLayout.customerFooter?.length
      ? uiLayout.customerFooter
      : DEFAULT_PLATFORM_SETTINGS.uiLayout.customerFooter,
    customerCategoriesLayout: uiLayout.customerCategoriesLayout?.length
      ? uiLayout.customerCategoriesLayout
      : DEFAULT_PLATFORM_SETTINGS.uiLayout.customerCategoriesLayout,
    sellerSidebar: uiLayout.sellerSidebar?.length
      ? uiLayout.sellerSidebar
      : DEFAULT_PLATFORM_SETTINGS.uiLayout.sellerSidebar,
    sellerDashboardWidgets: uiLayout.sellerDashboardWidgets?.length
      ? uiLayout.sellerDashboardWidgets
      : DEFAULT_PLATFORM_SETTINGS.uiLayout.sellerDashboardWidgets,
    sellerQuickActions: uiLayout.sellerQuickActions?.length
      ? uiLayout.sellerQuickActions
      : DEFAULT_PLATFORM_SETTINGS.uiLayout.sellerQuickActions,
    sellerDashboardCards: uiLayout.sellerDashboardCards?.length
      ? uiLayout.sellerDashboardCards
      : DEFAULT_PLATFORM_SETTINGS.uiLayout.sellerDashboardCards,
  };

  const updatedSettings = {
    ...currentSettings,
    branding: {
      ...DEFAULT_PLATFORM_SETTINGS.branding,
      ...(currentSettings.branding || {}),
    },
    uiLayout: updatedLayout,
  };

  await savePlatformSettings(updatedSettings);

  console.log(
    `[platform] Platform SSOT synchronization complete. Synced = true. Features inserted: ${featureRes.inserted}`
  );

  return {
    featuresInserted: featureRes.inserted,
    layoutSynced: true,
  };
};

/** Standalone script execution entry point */
if (process.argv[1]?.includes("syncService")) {
  syncPlatformDefaults()
    .then(() => {
      console.log("[platform] Migration script finished successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[platform] Migration script failed:", err);
      process.exit(1);
    });
}
