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

export interface PlatformSettingsData {
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
  marketplace: {
    marketplaceName: "Aura Marketplace",
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

export const savePlatformSettings = async (settings: PlatformSettingsData): Promise<PlatformSettingsData> => {
  const data = JSON.parse(JSON.stringify(settings));
  await prisma.platformSetting.upsert({
    where: { id: PLATFORM_SETTING_ID },
    update: { data },
    create: { id: PLATFORM_SETTING_ID, data },
  });
  return settings;
};

export const updatePlatformSettings = async (patch: Partial<PlatformSettingsData>): Promise<PlatformSettingsData> => {
  const current = await getPlatformSettings();
  const merged = {
    ...current,
    ...patch,
    marketplace: patch.marketplace ? { ...current.marketplace, ...patch.marketplace } : current.marketplace,
    commission: patch.commission ? { ...current.commission, ...patch.commission } : current.commission,
    maintenance: patch.maintenance ? { ...current.maintenance, ...patch.maintenance } : current.maintenance,
    storage: patch.storage ? { ...current.storage, ...patch.storage } : current.storage,
    security: patch.security ? { ...current.security, ...patch.security } : current.security,
  } as PlatformSettingsData;
  return savePlatformSettings(merged);
};
