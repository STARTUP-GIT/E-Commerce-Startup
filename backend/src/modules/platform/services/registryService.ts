// =============================================================================
// PLATFORM REGISTRY SERVICE
// -----------------------------------------------------------------------------
// Generic collection management for API keys, webhooks, release versions and
// backups, persisted inside the PlatformSetting JSON document (id = 2).
// =============================================================================

import crypto from "crypto";
import { getPlatformSettings, savePlatformSettings } from "./settingsService.js";
import type {
  ApiKeyRecord,
  WebhookRecord,
  ReleaseRecord,
  BackupRecord,
  PlatformSettingsData,
} from "./settingsService.js";

export const hashSecret = (secret: string): string =>
  crypto.createHash("sha256").update(secret).digest("hex");

export const randomSecret = (bytes = 32): string => crypto.randomBytes(bytes).toString("hex");

const newId = (): string => crypto.randomBytes(8).toString("hex");

// ─── API KEYS ────────────────────────────────────────────────────────────────

export const listApiKeys = async (): Promise<ApiKeyRecord[]> => {
  const settings = await getPlatformSettings();
  return settings.apiKeys || [];
};

export const createApiKey = async (params: {
  name: string;
  scopes: string[];
}): Promise<{ record: ApiKeyRecord; apiKey: string }> => {
  const settings = await getPlatformSettings();
  const secret = randomSecret();
  const prefix = `plk_${newId()}`;
  const record: ApiKeyRecord = {
    id: newId(),
    name: params.name,
    prefix,
    hash: hashSecret(secret),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revoked: false,
    scopes: params.scopes || [],
  };
  await savePlatformSettings({
    ...settings,
    apiKeys: [...(settings.apiKeys || []), record],
    apiKeysConfigured: (settings.apiKeys?.length || 0) + 1,
  });
  return { record, apiKey: `${prefix}.${secret}` };
};

export const revokeApiKey = async (id: string): Promise<ApiKeyRecord[]> => {
  const settings = await getPlatformSettings();
  const apiKeys = (settings.apiKeys || []).map((k) =>
    k.id === id ? { ...k, revoked: true } : k
  );
  await savePlatformSettings({ ...settings, apiKeys });
  return apiKeys;
};

export const deleteApiKey = async (id: string): Promise<ApiKeyRecord[]> => {
  const settings = await getPlatformSettings();
  const apiKeys = (settings.apiKeys || []).filter((k) => k.id !== id);
  await savePlatformSettings({
    ...settings,
    apiKeys,
    apiKeysConfigured: apiKeys.length,
  });
  return apiKeys;
};

export const verifyApiKey = async (key: string): Promise<ApiKeyRecord | null> => {
  const [prefix, secret] = key.split(".");
  if (!prefix || !secret) return null;
  const settings = await getPlatformSettings();
  const record = (settings.apiKeys || []).find((k) => k.prefix === prefix);
  if (!record || record.revoked) return null;
  if (record.hash !== hashSecret(key)) return null;
  return record;
};

// ─── WEBHOOKS ────────────────────────────────────────────────────────────────

export const listWebhooks = async (): Promise<WebhookRecord[]> => {
  const settings = await getPlatformSettings();
  return settings.webhooks || [];
};

export const createWebhook = async (params: {
  name: string;
  url: string;
  events: string[];
}): Promise<WebhookRecord[]> => {
  const settings = await getPlatformSettings();
  const secret = randomSecret(16);
  const record: WebhookRecord = {
    id: newId(),
    name: params.name,
    url: params.url,
    events: params.events || [],
    enabled: true,
    secretMasked: `whsec_${secret.slice(0, 6)}...`,
    createdAt: new Date().toISOString(),
  };
  await savePlatformSettings({
    ...settings,
    webhooks: [...(settings.webhooks || []), record],
  });
  return settings.webhooks || [];
};

export const updateWebhook = async (id: string, patch: Partial<WebhookRecord>): Promise<WebhookRecord[]> => {
  const settings = await getPlatformSettings();
  const webhooks = (settings.webhooks || []).map((w) =>
    w.id === id ? { ...w, ...patch, updatedAt: new Date().toISOString() } : w
  );
  await savePlatformSettings({ ...settings, webhooks });
  return webhooks;
};

export const deleteWebhook = async (id: string): Promise<WebhookRecord[]> => {
  const settings = await getPlatformSettings();
  const webhooks = (settings.webhooks || []).filter((w) => w.id !== id);
  await savePlatformSettings({ ...settings, webhooks });
  return webhooks;
};

// ─── RELEASE VERSIONS ────────────────────────────────────────────────────────

export const listVersions = async (): Promise<ReleaseRecord[]> => {
  const settings = await getPlatformSettings();
  return settings.versions || [];
};

export const createVersion = async (params: {
  version: string;
  name: string;
  notes: string;
  status?: ReleaseRecord["status"];
}): Promise<ReleaseRecord[]> => {
  const settings = await getPlatformSettings();
  const record: ReleaseRecord = {
    id: newId(),
    version: params.version,
    name: params.name,
    notes: params.notes,
    status: params.status || "released",
    releasedAt: new Date().toISOString(),
  };
  await savePlatformSettings({
    ...settings,
    versions: [record, ...(settings.versions || [])],
  });
  return settings.versions || [];
};

export const updateVersion = async (id: string, patch: Partial<ReleaseRecord>): Promise<ReleaseRecord[]> => {
  const settings = await getPlatformSettings();
  const versions = (settings.versions || []).map((v) => (v.id === id ? { ...v, ...patch } : v));
  await savePlatformSettings({ ...settings, versions });
  return versions;
};

export const deleteVersion = async (id: string): Promise<ReleaseRecord[]> => {
  const settings = await getPlatformSettings();
  const versions = (settings.versions || []).filter((v) => v.id !== id);
  await savePlatformSettings({ ...settings, versions });
  return versions;
};

// ─── BACKUPS ─────────────────────────────────────────────────────────────────

export const listBackups = async (): Promise<BackupRecord[]> => {
  const settings = await getPlatformSettings();
  return settings.backups || [];
};

export const createBackup = async (params: { label?: string; location?: string }): Promise<BackupRecord[]> => {
  const settings = await getPlatformSettings();
  const record: BackupRecord = {
    id: newId(),
    label: params.label || `manual-backup-${new Date().toISOString().slice(0, 10)}`,
    createdAt: new Date().toISOString(),
    sizeMb: 0,
    status: "in_progress",
    location: params.location || "database",
  };
  await savePlatformSettings({
    ...settings,
    backups: [record, ...(settings.backups || [])],
  });
  return settings.backups || [];
};

export const markBackupCompleted = async (id: string, sizeMb: number): Promise<BackupRecord[]> => {
  const settings = await getPlatformSettings();
  const backups = (settings.backups || []).map((b) =>
    b.id === id ? { ...b, status: "completed" as const, sizeMb } : b
  );
  await savePlatformSettings({ ...settings, backups });
  return backups;
};

export const deleteBackup = async (id: string): Promise<BackupRecord[]> => {
  const settings = await getPlatformSettings();
  const backups = (settings.backups || []).filter((b) => b.id !== id);
  await savePlatformSettings({ ...settings, backups });
  return backups;
};
