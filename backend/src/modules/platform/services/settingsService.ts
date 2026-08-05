// =============================================================================
// PLATFORM SETTINGS SERVICE
// -----------------------------------------------------------------------------
// Platform-level configuration (marketplace config, providers, security, etc.)
// Persisted in the EXISTING `PlatformSetting` table at row id = 2.
// Row id = 1 is owned by the Admin module (marketplace GST/fees) and is left
// completely untouched.
// =============================================================================

import { prisma } from "../../../config/prisma.js";

export const PLATFORM_SETTING_ID = 2;

export interface PaymentProviderConfig {
  provider: string;
  enabled: boolean;
  displayName: string;
  description?: string;
}

export interface OAuthProviderConfig {
  provider: string;
  enabled: boolean;
  displayName: string;
}

export interface StorageProviderConfig {
  provider: "cloudinary" | "aws_s3" | "azure_blob" | "local";
  displayName: string;
  enabled: boolean;
}

export interface EmailProviderConfig {
  provider: "resend" | "smtp" | "ses";
  displayName: string;
  enabled: boolean;
}

export interface MarketplaceConfiguration {
  marketplaceName: string;
  currency: string;
  taxRate: number;
  timezone: string;
  language: string;
  country: string;
  defaultCommission: number;
  maximumUploadSizeMb: number;
  maximumProductImages: number;
  maintenanceMessage: string;
  supportEmail: string;
  supportPhone: string;
}

export interface CommissionRule {
  category: string;
  rate: number;
}

export interface CommissionEngineConfig {
  defaultRate: number;
  maxRate: number;
  rules: CommissionRule[];
}

export interface MaintenanceConfig {
  maintenanceMode: boolean;
  message: string;
  allowedRoles: string[];
  startedAt?: string;
  endsAt?: string;
}

export interface BrandingConfiguration {
  name: string;
  marketplaceName: string;
  logo: string;
  favicon: string;
  tagline?: string;
  shortName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
}


export interface UiLayoutItem {
  id: string;
  name: string;
  enabled?: boolean;
  path?: string;
  featureKey?: string;
  icon?: string;
}

export interface UiBuilderLayout {
  customerHomepageSections: UiLayoutItem[];
  customerNavbar: UiLayoutItem[];
  customerFooter?: UiLayoutItem[];
  customerCategoriesLayout?: UiLayoutItem[];
  sellerDashboardWidgets: UiLayoutItem[];
  sellerSidebar: UiLayoutItem[];
  sellerQuickActions?: UiLayoutItem[];
  sellerDashboardCards?: UiLayoutItem[];
  synced?: boolean;
  syncedAt?: string;
}

export interface PlatformSettingsData {
  branding: BrandingConfiguration;
  uiLayout: UiBuilderLayout;
  marketplace: MarketplaceConfiguration;
  commission: CommissionEngineConfig;
  maintenance: MaintenanceConfig;
  paymentProviders: PaymentProviderConfig[];
  storage: StorageProviderConfig;
  emailProviders: EmailProviderConfig[];
  oauthProviders: OAuthProviderConfig[];
  razorpay: { enabled: boolean; keyId?: string; keySecretMasked?: string };
  apiKeysConfigured: number;
  security: {
    rateLimitEnabled: boolean;
    defaultRateLimitPerMinute: number;
    blockedIps: string[];
  };
  apiKeys: ApiKeyRecord[];
  webhooks: WebhookRecord[];
  versions: ReleaseRecord[];
  backups: BackupRecord[];
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  hash: string;
  createdAt: string;
  lastUsedAt?: string | null;
  revoked: boolean;
  scopes: string[];
}

export interface WebhookRecord {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  secretMasked?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReleaseRecord {
  id: string;
  version: string;
  name: string;
  notes: string;
  status: "pending" | "released" | "rolled_back" | "deprecated";
  releasedAt: string;
}

export interface BackupRecord {
  id: string;
  label: string;
  createdAt: string;
  sizeMb: number;
  status: "completed" | "failed" | "in_progress";
  location: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsData = {
  branding: {
    name: "Marketplace",
    marketplaceName: "Marketplace",
    logo: "/images/logo.png",
    favicon: "/favicon.ico",
    tagline: "Your local marketplace for everything",
    shortName: "Marketplace",
  },
  uiLayout: {
    synced: true,
    syncedAt: new Date().toISOString(),
    customerHomepageSections: [
      { id: "hero-banner", name: "Hero Banner", enabled: true },
      { id: "trending-categories", name: "Trending Categories", enabled: true },
      { id: "featured-shops", name: "Featured Creators", enabled: true },
      { id: "custom-prints", name: "Custom Prints CTA", enabled: true, featureKey: "CUSTOM_PRINTING" },
      { id: "value-props", name: "Value Props", enabled: true },
      { id: "guest-signup", name: "Guest Sign-up Banner", enabled: true },
    ],
    customerNavbar: [
      { id: "nav-home", name: "Home", path: "/", enabled: true },
      { id: "nav-categories", name: "Categories", path: "/categories", enabled: true },
      { id: "nav-shops", name: "Shops", path: "/shops", enabled: true },
      { id: "nav-products", name: "Products", path: "/products", enabled: true },
      { id: "nav-orders", name: "Orders", path: "/orders", enabled: true },
      { id: "nav-wishlist", name: "Wishlist", path: "/wishlist", featureKey: "WISHLIST", enabled: true },
      { id: "nav-custom-orders", name: "Custom Orders", path: "/custom-orders", featureKey: "CUSTOM_PRINTING", enabled: true },
    ],
    customerFooter: [
      { id: "foot-shops", name: "Browse Shops", path: "/shops", enabled: true },
      { id: "foot-categories", name: "Categories", path: "/categories", enabled: true },
      { id: "foot-custom-orders", name: "Custom Orders", path: "/custom-orders", featureKey: "CUSTOM_PRINTING", enabled: true },
      { id: "foot-orders", name: "Track Orders", path: "/orders", enabled: true },
    ],
    customerCategoriesLayout: [
      { id: "cat-grid", name: "Category Grid", enabled: true },
    ],
    sellerSidebar: [
      { id: "side-dashboard", name: "Dashboard", path: "/dashboard", enabled: true },
      { id: "side-products", name: "Products", path: "/products", featureKey: "PRODUCT_UPLOAD", enabled: true },
      { id: "side-orders", name: "Orders", path: "/orders", enabled: true },
      { id: "side-custom-orders", name: "Custom Requests", path: "/custom-orders", featureKey: "CUSTOM_PRINTING", enabled: true },
      { id: "side-analytics", name: "Analytics", path: "/analytics", featureKey: "ANALYTICS", enabled: true },
      { id: "side-payouts", name: "Payouts", path: "/payouts", featureKey: "PAYMENTS", enabled: true },
      { id: "side-reviews", name: "Reviews", path: "/reviews", featureKey: "REVIEWS", enabled: true },
      { id: "side-profile", name: "Seller Profile", path: "/profile", enabled: true },
      { id: "side-shop", name: "Shop & Bank", path: "/shop", featureKey: "BANK_ACCOUNT", enabled: true },
      { id: "side-settings", name: "Settings", path: "/settings", enabled: true },
    ],
    sellerDashboardWidgets: [
      { id: "widget-revenue", name: "Revenue Summary", enabled: true },
      { id: "widget-orders", name: "Recent Incoming Orders", enabled: true },
    ],
    sellerQuickActions: [
      { id: "action-add-product", name: "Add catalog item", path: "/products", featureKey: "PRODUCT_UPLOAD", enabled: true },
      { id: "action-quote-custom", name: "Quote custom requests", path: "/custom-orders", featureKey: "CUSTOM_PRINTING", enabled: true },
      { id: "action-link-bank", name: "Link settlement bank", path: "/shop", featureKey: "BANK_ACCOUNT", enabled: true },
    ],
    sellerDashboardCards: [
      { id: "card-gross-sales", name: "Gross Sales", enabled: true },
      { id: "card-net-earnings", name: "Net Earnings", enabled: true },
      { id: "card-commission", name: "Platform Commission", enabled: true },
      { id: "card-packing-fee", name: "Packing Fee Collected", enabled: true },
      { id: "card-delivered-revenue", name: "Delivered Revenue", enabled: true },
      { id: "card-todays-orders", name: "Today's Orders", enabled: true },
      { id: "card-pending-orders", name: "Pending Orders", enabled: true },
      { id: "card-completed-orders", name: "Completed Orders", enabled: true },
      { id: "card-cancelled-orders", name: "Cancelled Orders", enabled: true },
    ],
  },
  marketplace: {
    marketplaceName: "Marketplace",
    currency: "INR",
    taxRate: 18,
    timezone: "Asia/Kolkata",
    language: "en",
    country: "IN",
    defaultCommission: 10,
    maximumUploadSizeMb: 10,
    maximumProductImages: 8,
    maintenanceMessage: "We will be back shortly.",
    supportEmail: "support@example.com",
    supportPhone: "+91 00000 00000",
  },
  commission: {
    defaultRate: 10,
    maxRate: 30,
    rules: [],
  },
  maintenance: {
    maintenanceMode: false,
    message: "Scheduled maintenance in progress.",
    allowedRoles: [],
  },
  paymentProviders: [
    { provider: "razorpay", enabled: true, displayName: "Razorpay", description: "Primary payment gateway for India." },
    { provider: "stripe", enabled: false, displayName: "Stripe", description: "Global card payments." },
    { provider: "paypal", enabled: false, displayName: "PayPal", description: "International wallet payments." },
    { provider: "cod", enabled: true, displayName: "Cash on Delivery", description: "Cash collection at delivery." },
    { provider: "wallet", enabled: false, displayName: "Wallet", description: "In-app wallet balance." },
    { provider: "upi", enabled: true, displayName: "UPI", description: "Unified Payments Interface." },
  ],
  storage: { provider: "cloudinary", displayName: "Cloudinary", enabled: true },
  emailProviders: [
    { provider: "resend", enabled: true, displayName: "Resend" },
    { provider: "smtp", enabled: false, displayName: "SMTP" },
    { provider: "ses", enabled: false, displayName: "AWS SES" },
  ],
  oauthProviders: [
    { provider: "google", enabled: false, displayName: "Google" },
    { provider: "apple", enabled: false, displayName: "Apple" },
    { provider: "microsoft", enabled: false, displayName: "Microsoft" },
    { provider: "github", enabled: false, displayName: "GitHub" },
    { provider: "facebook", enabled: false, displayName: "Facebook" },
  ],
  razorpay: { enabled: true },
  apiKeysConfigured: 0,
  security: {
    rateLimitEnabled: true,
    defaultRateLimitPerMinute: 120,
    blockedIps: [],
  },
  apiKeys: [],
  webhooks: [],
  versions: [],
  backups: [],
};

export const getPlatformSettings = async (): Promise<PlatformSettingsData> => {
  const row = await prisma.platformSetting.findUnique({ where: { id: PLATFORM_SETTING_ID } });
  if (!row) return DEFAULT_PLATFORM_SETTINGS;
  try {
    const data = row.data as unknown as PlatformSettingsData;
    return {
      ...DEFAULT_PLATFORM_SETTINGS,
      ...data,
      branding: { ...DEFAULT_PLATFORM_SETTINGS.branding, ...(data.branding || {}) },
      uiLayout: { ...DEFAULT_PLATFORM_SETTINGS.uiLayout, ...(data.uiLayout || {}) },
      marketplace: { ...DEFAULT_PLATFORM_SETTINGS.marketplace, ...(data.marketplace || {}) },
      commission: { ...DEFAULT_PLATFORM_SETTINGS.commission, ...(data.commission || {}) },
      maintenance: { ...DEFAULT_PLATFORM_SETTINGS.maintenance, ...(data.maintenance || {}) },
      storage: { ...DEFAULT_PLATFORM_SETTINGS.storage, ...(data.storage || {}) },
      security: { ...DEFAULT_PLATFORM_SETTINGS.security, ...(data.security || {}) },
    };
  } catch {
    return DEFAULT_PLATFORM_SETTINGS;
  }
};

let brandingCache: BrandingConfiguration | null = null;

export const invalidateBrandingCache = (): void => {
  brandingCache = null;
};

export const getPlatformBranding = async (): Promise<BrandingConfiguration> => {
  if (brandingCache) return brandingCache;
  const settings = await getPlatformSettings();
  const b = settings.branding || DEFAULT_PLATFORM_SETTINGS.branding;
  const logoVal = b.logo !== undefined ? b.logo : (b.logoUrl !== undefined ? b.logoUrl : DEFAULT_PLATFORM_SETTINGS.branding.logo);
  const faviconVal = b.favicon !== undefined ? b.favicon : (b.faviconUrl !== undefined ? b.faviconUrl : DEFAULT_PLATFORM_SETTINGS.branding.favicon);
  const nameVal = (b.name && b.name.trim()) || b.marketplaceName || DEFAULT_PLATFORM_SETTINGS.branding.marketplaceName;
  const taglineVal = b.tagline || DEFAULT_PLATFORM_SETTINGS.branding.tagline || "Your local marketplace for everything";
  const shortNameVal = b.shortName || nameVal;

  const normalized: BrandingConfiguration = {
    name: nameVal,
    marketplaceName: nameVal,
    logo: logoVal,
    favicon: faviconVal,
    tagline: taglineVal,
    shortName: shortNameVal,
    logoUrl: logoVal,
    faviconUrl: faviconVal,
    updatedAt: b.updatedAt || new Date().toISOString(),
    updatedBy: b.updatedBy || "system",
  };
  brandingCache = normalized;
  return normalized;
};

export const savePlatformSettings = async (settings: PlatformSettingsData): Promise<PlatformSettingsData> => {
  const data = JSON.parse(JSON.stringify(settings));
  await prisma.platformSetting.upsert({
    where: { id: PLATFORM_SETTING_ID },
    update: { data },
    create: { id: PLATFORM_SETTING_ID, data },
  });
  invalidateBrandingCache();
  return settings;
};

export const updatePlatformSettings = async (patch: Partial<PlatformSettingsData>): Promise<PlatformSettingsData> => {
  const current = await getPlatformSettings();
  const merged = {
    ...current,
    ...patch,
    branding: patch.branding ? { ...current.branding, ...patch.branding } : current.branding,
    uiLayout: patch.uiLayout ? { ...current.uiLayout, ...patch.uiLayout } : current.uiLayout,
    marketplace: patch.marketplace ? { ...current.marketplace, ...patch.marketplace } : current.marketplace,
    commission: patch.commission ? { ...current.commission, ...patch.commission } : current.commission,
    maintenance: patch.maintenance ? { ...current.maintenance, ...patch.maintenance } : current.maintenance,
    storage: patch.storage ? { ...current.storage, ...patch.storage } : current.storage,
    security: patch.security ? { ...current.security, ...patch.security } : current.security,
  } as PlatformSettingsData;
  invalidateBrandingCache();
  return savePlatformSettings(merged);
};

export const updatePlatformBranding = async (
  patch: Partial<BrandingConfiguration>,
  updatedBy: string = "system"
): Promise<BrandingConfiguration> => {
  const current = await getPlatformSettings();
  const newLogo = patch.logo !== undefined ? patch.logo : (patch.logoUrl !== undefined ? patch.logoUrl : current.branding.logo);
  const newFavicon = patch.favicon !== undefined ? patch.favicon : (patch.faviconUrl !== undefined ? patch.faviconUrl : current.branding.favicon);
  const rawName = patch.name !== undefined ? patch.name : patch.marketplaceName;
  const newName = (rawName !== undefined && rawName.trim() !== "") ? rawName.trim() : (current.branding.name || current.branding.marketplaceName || "Marketplace");
  const newTagline = patch.tagline !== undefined ? patch.tagline : (current.branding.tagline || "Your local marketplace for everything");
  const newShortName = patch.shortName !== undefined ? patch.shortName : (current.branding.shortName || newName);
  const now = new Date().toISOString();

  const updatedBranding: BrandingConfiguration = {
    name: newName,
    marketplaceName: newName,
    logo: newLogo,
    favicon: newFavicon,
    tagline: newTagline,
    shortName: newShortName,
    logoUrl: newLogo,
    faviconUrl: newFavicon,
    updatedAt: now,
    updatedBy: updatedBy,
  };

  await updatePlatformSettings({
    branding: updatedBranding,
    marketplace: {
      ...current.marketplace,
      marketplaceName: newName,
    },
  });

  invalidateBrandingCache();
  return getPlatformBranding();
};

