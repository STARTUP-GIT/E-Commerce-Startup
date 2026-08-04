// =============================================================================
// PLATFORM CONSTANTS
// =============================================================================

export const PLATFORM_MODULE = "platform";

/** Permission keys used across the Platform RBAC. */
export const PERMISSIONS = {
  DASHBOARD_VIEW: "platform.dashboard.view",
  SYSTEM_VIEW: "platform.system.view",
  FEATURE_FLAGS_VIEW: "platform.featureFlags.view",
  FEATURE_FLAGS_MANAGE: "platform.featureFlags.manage",
  MAINTENANCE_MANAGE: "platform.maintenance.manage",
  MARKETPLACE_VIEW: "platform.marketplace.view",
  MARKETPLACE_MANAGE: "platform.marketplace.manage",
  COMMISSION_MANAGE: "platform.commission.manage",
  PAYMENTS_VIEW: "platform.payments.view",
  PAYMENTS_MANAGE: "platform.payments.manage",
  PAYMENT_PROVIDERS_MANAGE: "platform.paymentProviders.manage",
  STORAGE_MANAGE: "platform.storage.manage",
  EMAIL_PROVIDERS_MANAGE: "platform.emailProviders.manage",
  OAUTH_MANAGE: "platform.oauth.manage",
  API_KEYS_MANAGE: "platform.apiKeys.manage",
  MONITORING_VIEW: "platform.monitoring.view",
  LOGS_VIEW: "platform.logs.view",
  AUDIT_VIEW: "platform.audit.view",
  QUEUES_MANAGE: "platform.queues.manage",
  RELEASE_MANAGE: "platform.release.manage",
  WEBHOOKS_MANAGE: "platform.webhooks.manage",
  DEV_TOOLS_MANAGE: "platform.devTools.manage",
  ROLES_MANAGE: "platform.roles.manage",
  PERMISSIONS_MANAGE: "platform.permissions.manage",
  USERS_MANAGE: "platform.users.manage",
  SECURITY_MANAGE: "platform.security.manage",
  BACKUPS_MANAGE: "platform.backups.manage",
  VERSIONS_VIEW: "platform.versions.view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS);

export const PLATFORM_ROLE_TYPES = ["OWNER", "ADMINISTRATOR", "DEVELOPER", "DEVOPS", "CUSTOM"] as const;
