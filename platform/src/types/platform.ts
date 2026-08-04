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

export interface PaymentProviderConfig {
  provider: string;
  enabled: boolean;
  displayName: string;
  description?: string;
}

export interface StorageProviderConfig {
  provider: 'cloudinary' | 'aws_s3' | 'azure_blob' | 'local';
  displayName: string;
  enabled: boolean;
  cloudName?: string;
  apiKey?: string;
  apiSecretMasked?: string;
  bucket?: string;
  region?: string;
  container?: string;
  connectionStringMasked?: string;
}

export interface EmailProviderConfig {
  provider: 'resend' | 'smtp' | 'ses';
  displayName: string;
  enabled: boolean;
}

export interface OAuthProviderConfig {
  provider: string;
  enabled: boolean;
  displayName: string;
}

export interface SecuritySettings {
  rateLimitEnabled: boolean;
  defaultRateLimitPerMinute: number;
  blockedIps: string[];
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
  status: 'pending' | 'released' | 'rolled_back' | 'deprecated';
  releasedAt: string;
}

export interface BackupRecord {
  id: string;
  label: string;
  createdAt: string;
  sizeMb: number;
  status: 'completed' | 'failed' | 'in_progress';
  location: string;
}

export interface PlatformSettings {
  marketplace: MarketplaceConfiguration;
  commission: CommissionEngineConfig;
  maintenance: MaintenanceConfig;
  paymentProviders: PaymentProviderConfig[];
  storage: StorageProviderConfig;
  emailProviders: EmailProviderConfig[];
  oauthProviders: OAuthProviderConfig[];
  razorpay: { enabled: boolean; keyId?: string; keySecretMasked?: string };
  apiKeysConfigured: number;
  security: SecuritySettings;
  apiKeys: ApiKeyRecord[];
  webhooks: WebhookRecord[];
  versions: ReleaseRecord[];
  backups: BackupRecord[];
}

export interface HealthResponse {
  health: {
    status: 'healthy' | 'degraded' | 'down';
    timestamp: string;
    uptime: string;
    uptimeSeconds: number;
    hostname: string;
    platform: string;
    nodeVersion: string;
    cpu: {
      cores: number;
      model: string;
      load1m: number;
      load5m: number;
      load15m: number;
    };
    memory: {
      totalBytes: number;
      freeBytes: number;
      usedBytes: number;
      usedPercent: number;
    };
    storage: { freeBytes: number; totalBytes: number };
    database: { status: string; latencyMs: number | null };
    featureFlags: Record<string, boolean>;
  };
}

export interface OverviewResponse {
  overview: {
    platformUsers: number;
    featureFlags: number;
    enabledFeatureFlags: number;
    roles: number;
    auditEntries: number;
    maintenanceMode: boolean;
    activePaymentProviders: number;
    cpuLoad1m: number;
    memoryUsedPercent: number;
  };
}

export interface AuditLogEntry {
  id: string;
  userId?: string | null;
  email?: string | null;
  action: string;
  module: string;
  targetType?: string | null;
  targetId?: string | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  createdAt: string;
}

export interface Queue {
  name: string;
  pending: number;
  processing: number;
  failed: number;
  status: string;
}

export interface BackgroundJob {
  name: string;
  schedule: string;
  lastRun: string | null;
  status: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  userType: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
}
