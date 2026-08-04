// =============================================================================
// PLATFORM RBAC SEEDER
// -----------------------------------------------------------------------------
// Creates the system roles + the full permission catalogue on startup.
// System roles cannot be deleted. Platform Owner role gets every permission.
// =============================================================================

import { prisma } from "../../../config/prisma.js";
import { ALL_PERMISSIONS, PERMISSIONS, type PermissionKey } from "./constants.js";
import type { PlatformRoleType } from "@prisma/client";

interface PermissionSeed {
  key: string;
  name: string;
  module: string;
  description?: string;
}

const permissionSeeds: PermissionSeed[] = [
  { key: PERMISSIONS.DASHBOARD_VIEW, name: "View Dashboard", module: "dashboard", description: "View the platform overview dashboard." },
  { key: PERMISSIONS.SYSTEM_VIEW, name: "View System", module: "system", description: "View system-level information." },
  { key: PERMISSIONS.FEATURE_FLAGS_VIEW, name: "View Feature Flags", module: "feature-flags", description: "View feature flag configuration." },
  { key: PERMISSIONS.FEATURE_FLAGS_MANAGE, name: "Manage Feature Flags", module: "feature-flags", description: "Create, edit, enable, disable and schedule feature flags." },
  { key: PERMISSIONS.MAINTENANCE_MANAGE, name: "Manage Maintenance", module: "maintenance", description: "Toggle maintenance mode and message." },
  { key: PERMISSIONS.MARKETPLACE_VIEW, name: "View Marketplace Config", module: "marketplace", description: "View marketplace configuration." },
  { key: PERMISSIONS.MARKETPLACE_MANAGE, name: "Manage Marketplace Config", module: "marketplace", description: "Edit marketplace name, currency, tax, limits and support details." },
  { key: PERMISSIONS.COMMISSION_MANAGE, name: "Manage Commission Engine", module: "commission", description: "Configure commission rates and rules." },
  { key: PERMISSIONS.PAYMENTS_VIEW, name: "View Payments", module: "payments", description: "View payment and provider status." },
  { key: PERMISSIONS.PAYMENTS_MANAGE, name: "Manage Payments", module: "payments", description: "Manage payment operations and payouts." },
  { key: PERMISSIONS.PAYMENT_PROVIDERS_MANAGE, name: "Manage Payment Providers", module: "payments", description: "Enable or disable payment providers." },
  { key: PERMISSIONS.STORAGE_MANAGE, name: "Manage Storage", module: "storage", description: "Select and configure the active storage provider." },
  { key: PERMISSIONS.EMAIL_PROVIDERS_MANAGE, name: "Manage Email Providers", module: "email", description: "Enable or disable email delivery providers." },
  { key: PERMISSIONS.OAUTH_MANAGE, name: "Manage OAuth Providers", module: "oauth", description: "Enable or disable OAuth sign-in providers." },
  { key: PERMISSIONS.API_KEYS_MANAGE, name: "Manage API Keys", module: "api-keys", description: "Create, rotate and revoke platform API keys." },
  { key: PERMISSIONS.MONITORING_VIEW, name: "View Monitoring", module: "monitoring", description: "View health, CPU, memory, storage and service monitors." },
  { key: PERMISSIONS.LOGS_VIEW, name: "View Logs", module: "monitoring", description: "View system and application logs." },
  { key: PERMISSIONS.AUDIT_VIEW, name: "View Audit Logs", module: "monitoring", description: "View the platform audit trail." },
  { key: PERMISSIONS.QUEUES_MANAGE, name: "Manage Queues", module: "monitoring", description: "Manage queues and background jobs." },
  { key: PERMISSIONS.RELEASE_MANAGE, name: "Manage Releases", module: "release", description: "Record and manage software releases." },
  { key: PERMISSIONS.WEBHOOKS_MANAGE, name: "Manage Webhooks", module: "webhooks", description: "Manage outbound webhook endpoints." },
  { key: PERMISSIONS.DEV_TOOLS_MANAGE, name: "Use Developer Tools", module: "developer-tools", description: "Access developer tooling." },
  { key: PERMISSIONS.ROLES_MANAGE, name: "Manage Roles", module: "rbac", description: "Create and edit platform roles." },
  { key: PERMISSIONS.PERMISSIONS_MANAGE, name: "Manage Permissions", module: "rbac", description: "Manage the permission catalogue." },
  { key: PERMISSIONS.USERS_MANAGE, name: "Manage Platform Users", module: "users", description: "Create, disable and reset platform users." },
  { key: PERMISSIONS.SECURITY_MANAGE, name: "Manage Security", module: "security", description: "Manage rate limits, blocked IPs and security policy." },
  { key: PERMISSIONS.BACKUPS_MANAGE, name: "Manage Backups", module: "security", description: "Create and restore platform backups." },
  { key: PERMISSIONS.VERSIONS_VIEW, name: "View Version History", module: "security", description: "View platform version history." },
];

const systemRoleSeeds: { name: string; type: PlatformRoleType; description: string; keys: PermissionKey[] }[] = [
  {
    name: "Platform Owner",
    type: "OWNER",
    description: "Full access to every Platform capability.",
    keys: ALL_PERMISSIONS as PermissionKey[],
  },
  {
    name: "Platform Administrator",
    type: "ADMINISTRATOR",
    description: "Operational administration of the software platform.",
    keys: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.SYSTEM_VIEW,
      PERMISSIONS.FEATURE_FLAGS_VIEW,
      PERMISSIONS.FEATURE_FLAGS_MANAGE,
      PERMISSIONS.MAINTENANCE_MANAGE,
      PERMISSIONS.MARKETPLACE_VIEW,
      PERMISSIONS.MARKETPLACE_MANAGE,
      PERMISSIONS.COMMISSION_MANAGE,
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.PAYMENTS_MANAGE,
      PERMISSIONS.PAYMENT_PROVIDERS_MANAGE,
      PERMISSIONS.STORAGE_MANAGE,
      PERMISSIONS.EMAIL_PROVIDERS_MANAGE,
      PERMISSIONS.OAUTH_MANAGE,
      PERMISSIONS.MONITORING_VIEW,
      PERMISSIONS.LOGS_VIEW,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.QUEUES_MANAGE,
      PERMISSIONS.RELEASE_MANAGE,
      PERMISSIONS.WEBHOOKS_MANAGE,
      PERMISSIONS.USERS_MANAGE,
      PERMISSIONS.SECURITY_MANAGE,
      PERMISSIONS.BACKUPS_MANAGE,
      PERMISSIONS.VERSIONS_VIEW,
    ],
  },
  {
    name: "Developer",
    type: "DEVELOPER",
    description: "Engineering access: feature flags, webhooks, releases, tools and logs.",
    keys: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.SYSTEM_VIEW,
      PERMISSIONS.FEATURE_FLAGS_VIEW,
      PERMISSIONS.FEATURE_FLAGS_MANAGE,
      PERMISSIONS.MONITORING_VIEW,
      PERMISSIONS.LOGS_VIEW,
      PERMISSIONS.QUEUES_MANAGE,
      PERMISSIONS.RELEASE_MANAGE,
      PERMISSIONS.WEBHOOKS_MANAGE,
      PERMISSIONS.DEV_TOOLS_MANAGE,
      PERMISSIONS.API_KEYS_MANAGE,
      PERMISSIONS.VERSIONS_VIEW,
    ],
  },
  {
    name: "DevOps",
    type: "DEVOPS",
    description: "Infrastructure access: monitoring, security, backups and maintenance.",
    keys: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.SYSTEM_VIEW,
      PERMISSIONS.MAINTENANCE_MANAGE,
      PERMISSIONS.MONITORING_VIEW,
      PERMISSIONS.LOGS_VIEW,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.QUEUES_MANAGE,
      PERMISSIONS.SECURITY_MANAGE,
      PERMISSIONS.BACKUPS_MANAGE,
      PERMISSIONS.VERSIONS_VIEW,
      PERMISSIONS.RELEASE_MANAGE,
      PERMISSIONS.STORAGE_MANAGE,
    ],
  },
];

/** Idempotent — safe to call on every boot. */
export const seedPlatformRolesAndPermissions = async (): Promise<void> => {
  try {
    for (const seed of permissionSeeds) {
      const existing = await prisma.platformPermission.findUnique({ where: { key: seed.key } });
      if (!existing) {
        await prisma.platformPermission.create({ data: seed });
      }
    }

    for (const role of systemRoleSeeds) {
      const permissions = await prisma.platformPermission.findMany({
        where: { key: { in: role.keys } },
      });

      const existing = await prisma.platformRole.findUnique({ where: { name: role.name } });
      if (existing) {
        await prisma.platformRole.update({
          where: { id: existing.id },
          data: {
            description: role.description,
            type: role.type,
            isSystem: true,
            permissions: { set: permissions.map((p) => ({ id: p.id })) },
          },
        });
        continue;
      }

      await prisma.platformRole.create({
        data: {
          name: role.name,
          description: role.description,
          type: role.type,
          isSystem: true,
          permissions: { connect: permissions.map((p) => ({ id: p.id })) },
        },
      });
    }

    console.log("[platform] Roles & permissions seeded successfully.");
  } catch (error) {
    console.error("[platform] Failed to seed roles & permissions:", error);
  }
};

/** Returns the OWNER system role (assigned to the first Platform user). */
export const getOwnerRole = async () =>
  prisma.platformRole.findFirst({ where: { type: "OWNER", isSystem: true } });
