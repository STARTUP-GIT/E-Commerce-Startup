-- =============================================================================
-- REMOVE THE PLATFORM APPLICATION + ADD ADMIN RBAC / BRANDING / CMS
-- =============================================================================
-- 1. Marketplace branding moves out of `platform_settings` row 2 (the removed
--    Platform app's branding + UI-layout blob) into the new Admin-owned
--    `marketplace_branding` table. Data is COPIED, never dropped.
-- 2. `platform_settings` row 1 (GST / platform fee / packing rules / gateway /
--    order parameters) is business configuration and is preserved. The table is
--    renamed to `marketplace_settings`.
-- 3. `admin_roles` becomes the single Admin authorization model.
-- 4. `content_blocks` backs Admin → Content Management.
-- 5. The Platform application's own tables are dropped: platform users/roles/
--    permissions (Platform RBAC), features (feature flags) and audit_trails
--    (Platform audit log). Admin audit logs live in `admin_actions` and are
--    untouched.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. MARKETPLACE BRANDING (Admin-owned)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "marketplace_branding" (
    "id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandName" VARCHAR(150) NOT NULL DEFAULT 'Marketplace',
    "shortName" VARCHAR(80),
    "tagline" VARCHAR(300),
    "logoUrl" VARCHAR(2048) NOT NULL DEFAULT '/images/logo.png',
    "faviconUrl" VARCHAR(2048),
    "browserTitle" VARCHAR(200),
    "seoTitle" VARCHAR(200),
    "seoDescription" VARCHAR(500),
    "primaryColor" VARCHAR(30),
    "secondaryColor" VARCHAR(30),
    "supportEmail" VARCHAR(320),
    "supportPhone" VARCHAR(50),
    "heroBadge" VARCHAR(200),
    "heroHeadingLine1" VARCHAR(200),
    "heroHeadingLine2" VARCHAR(200),
    "heroHeadingLine3" VARCHAR(200),
    "heroDescription" TEXT,
    "searchPlaceholder" VARCHAR(200),
    "exploreShopsButtonText" VARCHAR(100),
    "browseProductsButtonText" VARCHAR(100),
    "footerDescription" TEXT,
    "updatedBy" VARCHAR(30),

    CONSTRAINT "marketplace_branding_pkey" PRIMARY KEY ("id")
);

-- Safe default row so the marketplace always has brand data.
INSERT INTO "marketplace_branding" (
    "id", "updatedAt", "brandName", "logoUrl", "browserTitle", "seoTitle", "seoDescription", "createdAt"
) VALUES (
    1, CURRENT_TIMESTAMP, 'Marketplace', '/images/logo.png', 'Marketplace',
    'Marketplace', 'Discover local artisans, handcrafted items, and custom products.', CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- Copy the live branding out of platform_settings row 2 (if it exists).
UPDATE "marketplace_branding" AS mb
SET
    "brandName"       = COALESCE(NULLIF(s.b ->> 'name', ''),         NULLIF(s.b ->> 'marketplaceName', ''), mb."brandName"),
    "shortName"       = COALESCE(NULLIF(s.b ->> 'shortName', ''),     mb."shortName"),
    "tagline"         = COALESCE(NULLIF(s.b ->> 'tagline', ''),       mb."tagline"),
    "logoUrl"         = COALESCE(NULLIF(s.b ->> 'logo', ''),          NULLIF(s.b ->> 'logoUrl', ''),    mb."logoUrl"),
    "faviconUrl"      = COALESCE(NULLIF(s.b ->> 'favicon', ''),       NULLIF(s.b ->> 'faviconUrl', ''), mb."faviconUrl"),
    "browserTitle"    = COALESCE(NULLIF(s.b ->> 'browserTitle', ''),  mb."browserTitle"),
    "seoTitle"        = COALESCE(NULLIF(s.b ->> 'seoTitle', ''),      mb."seoTitle"),
    "seoDescription"  = COALESCE(NULLIF(s.b ->> 'seoDescription', ''), mb."seoDescription"),
    "heroBadge"       = COALESCE(NULLIF(s.b ->> 'heroBadge', ''),      mb."heroBadge"),
    "heroHeadingLine1" = COALESCE(NULLIF(s.b ->> 'heroHeadingLine1', ''), mb."heroHeadingLine1"),
    "heroHeadingLine2" = COALESCE(NULLIF(s.b ->> 'heroHeadingLine2', ''), mb."heroHeadingLine2"),
    "heroHeadingLine3" = COALESCE(NULLIF(s.b ->> 'heroHeadingLine3', ''), mb."heroHeadingLine3"),
    "heroDescription" = COALESCE(NULLIF(s.b ->> 'heroDescription', ''),  mb."heroDescription"),
    "searchPlaceholder" = COALESCE(NULLIF(s.b ->> 'searchPlaceholder', ''), mb."searchPlaceholder"),
    "exploreShopsButtonText" = COALESCE(NULLIF(s.b ->> 'exploreShopsButtonText', ''), mb."exploreShopsButtonText"),
    "browseProductsButtonText" = COALESCE(NULLIF(s.b ->> 'browseProductsButtonText', ''), mb."browseProductsButtonText"),
    "footerDescription" = COALESCE(NULLIF(s.b ->> 'footerDescription', ''), mb."footerDescription"),
    "updatedAt"       = CURRENT_TIMESTAMP
FROM (
    SELECT data -> 'branding' AS b
    FROM "platform_settings"
    WHERE "id" = 2
) AS s
WHERE s.b IS NOT NULL;

-- Fall back to the logo when no favicon was configured, so browser tabs never
-- show a framework default icon.
UPDATE "marketplace_branding"
SET "faviconUrl" = "logoUrl"
WHERE "faviconUrl" IS NULL OR btrim("faviconUrl") = '' OR "faviconUrl" = '/favicon.ico';

-- The Platform branding/UI-layout row has been migrated away.
DELETE FROM "platform_settings" WHERE "id" = 2;

-- Preserve the business configuration row (id = 1) and give the table a
-- non-Platform name.
ALTER TABLE "platform_settings" RENAME TO "marketplace_settings";
ALTER TABLE "marketplace_settings" RENAME CONSTRAINT "platform_settings_pkey" TO "marketplace_settings_pkey";

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ADMIN ROLES & PERMISSIONS (single Admin authorization model)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "admin_roles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_roles_name_key" ON "admin_roles"("name");
CREATE INDEX "admin_roles_isSystem_idx" ON "admin_roles"("isSystem");

INSERT INTO "admin_roles" ("id", "name", "displayName", "description", "isSystem", "permissions", "updatedAt") VALUES
(
  'role_owner', 'OWNER', 'Owner', 'Full marketplace ownership. Unrestricted access.', true,
  ARRAY[
    'dashboard.view','analytics.view','customers.view','customers.manage','sellers.view','sellers.manage',
    'orders.view','orders.manage','payments.view','payments.refund','reports.view','reports.export',
    'support.view','support.manage','moderation.view','moderation.manage','content.view','content.manage',
    'branding.view','branding.manage','settings.view','settings.manage','notifications.view','notifications.manage',
    'coupons.view','coupons.manage','catalog.view','catalog.manage','delivery.view','delivery.manage',
    'returns.view','returns.manage','sessions.view','sessions.manage',
    'admin.users.manage','admin.roles.manage','audit_logs.view'
  ]::TEXT[], CURRENT_TIMESTAMP
),
(
  'role_super_admin', 'SUPER_ADMIN', 'Super Admin', 'Everything an owner can do, including role management.', true,
  ARRAY[
    'dashboard.view','analytics.view','customers.view','customers.manage','sellers.view','sellers.manage',
    'orders.view','orders.manage','payments.view','payments.refund','reports.view','reports.export',
    'support.view','support.manage','moderation.view','moderation.manage','content.view','content.manage',
    'branding.view','branding.manage','settings.view','settings.manage','notifications.view','notifications.manage',
    'coupons.view','coupons.manage','catalog.view','catalog.manage','delivery.view','delivery.manage',
    'returns.view','returns.manage','sessions.view','sessions.manage',
    'admin.users.manage','admin.roles.manage','audit_logs.view'
  ]::TEXT[], CURRENT_TIMESTAMP
),
(
  'role_administrator', 'ADMINISTRATOR', 'Administrator', 'Day-to-day marketplace operations without role management.', true,
  ARRAY[
    'dashboard.view','analytics.view','customers.view','customers.manage','sellers.view','sellers.manage',
    'orders.view','orders.manage','payments.view','payments.refund','reports.view','reports.export',
    'support.view','support.manage','moderation.view','moderation.manage','content.view','content.manage',
    'branding.view','branding.manage','settings.view','settings.manage','notifications.view','notifications.manage',
    'coupons.view','coupons.manage','catalog.view','catalog.manage','delivery.view','delivery.manage',
    'returns.view','returns.manage','sessions.view','sessions.manage',
    'audit_logs.view'
  ]::TEXT[], CURRENT_TIMESTAMP
),
(
  'role_finance', 'FINANCE', 'Finance', 'Payments, refunds, payouts, commissions and financial reporting.', true,
  ARRAY[
    'dashboard.view','analytics.view','customers.view','sellers.view','orders.view',
    'payments.view','payments.refund','reports.view','reports.export','sessions.view','audit_logs.view','settings.view'
  ]::TEXT[], CURRENT_TIMESTAMP
),
(
  'role_support', 'SUPPORT', 'Support', 'Customer and seller support, tickets and order resolution.', true,
  ARRAY[
    'dashboard.view','customers.view','customers.manage','sellers.view','orders.view','orders.manage',
    'support.view','support.manage','moderation.view','reports.view','notifications.view','sessions.view','audit_logs.view'
  ]::TEXT[], CURRENT_TIMESTAMP
),
(
  'role_moderator', 'MODERATOR', 'Moderator', 'Content moderation: reviews, reports and product approvals.', true,
  ARRAY[
    'dashboard.view','customers.view','sellers.view','catalog.view','catalog.manage',
    'moderation.view','moderation.manage','reports.view','support.view','audit_logs.view'
  ]::TEXT[], CURRENT_TIMESTAMP
),
(
  'role_seller_manager', 'SELLER_MANAGER', 'Seller Manager', 'Seller onboarding, verification, performance and payouts.', true,
  ARRAY[
    'dashboard.view','analytics.view','customers.view','sellers.view','sellers.manage','orders.view',
    'reports.view','reports.export','support.view','audit_logs.view','notifications.view'
  ]::TEXT[], CURRENT_TIMESTAMP
),
(
  'role_developer', 'DEVELOPER', 'Developer', 'Product, content and configuration access for engineering.', true,
  ARRAY[
    'dashboard.view','analytics.view','catalog.view','catalog.manage','content.view','content.manage',
    'reports.view','settings.view','sessions.view','audit_logs.view'
  ]::TEXT[], CURRENT_TIMESTAMP
),
(
  'role_devops', 'DEVOPS', 'DevOps', 'Operational visibility: sessions, settings and audit trails.', true,
  ARRAY[
    'dashboard.view','analytics.view','sessions.view','sessions.manage','settings.view',
    'reports.view','audit_logs.view'
  ]::TEXT[], CURRENT_TIMESTAMP
);

ALTER TABLE "admins" ADD COLUMN "roleId" VARCHAR(30);
CREATE INDEX "admins_roleId_idx" ON "admins"("roleId");
ALTER TABLE "admins" ADD CONSTRAINT "admins_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "admin_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing admins keep working: map legacy role strings onto system roles.
UPDATE "admins" SET "roleId" = 'role_super_admin' WHERE "isSuperAdmin" = true AND "roleId" IS NULL;
UPDATE "admins" SET "roleId" = 'role_administrator'
    WHERE "roleId" IS NULL
      AND (UPPER("role") IS NULL OR UPPER("role") NOT IN ('OWNER','SUPER_ADMIN','ADMINISTRATOR','FINANCE','SUPPORT','MODERATOR','SELLER_MANAGER','DEVELOPER','DEVOPS'));
UPDATE "admins" SET "roleId" = (
    SELECT r."id" FROM "admin_roles" r WHERE r."name" = UPPER("admins"."role")
)
WHERE "roleId" IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CONTENT MANAGEMENT (CMS)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE "ContentPlacement" AS ENUM ('HOME_HERO', 'HOME_BANNER', 'HOME_STRIP', 'CATEGORY_PROMO', 'STORE_PROMO', 'ANNOUNCEMENT', 'FOOTER', 'OTHER');
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "content_blocks" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "subtitle" VARCHAR(300),
    "body" TEXT,
    "imageUrl" VARCHAR(2048),
    "linkUrl" VARCHAR(2048),
    "placement" "ContentPlacement" NOT NULL DEFAULT 'HOME_BANNER',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visibleFrom" TIMESTAMP(3),
    "visibleTo" TIMESTAMP(3),
    "createdById" VARCHAR(30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_blocks_placement_status_idx" ON "content_blocks"("placement", "status");
CREATE INDEX "content_blocks_status_sortOrder_idx" ON "content_blocks"("status", "sortOrder");
CREATE INDEX "content_blocks_createdAt_idx" ON "content_blocks"("createdAt");

-- Audit action types used by the new Admin screens (immutable log entries).
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'SUPPORT_TICKET_REPLIED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'BRANDING_UPDATED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'CONTENT_CREATED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'CONTENT_UPDATED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'CONTENT_DELETED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'CONTENT_PUBLISHED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'ROLE_CREATED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'ROLE_UPDATED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'ROLE_DELETED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'ADMIN_CREATED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'ADMIN_UPDATED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'ADMIN_STATUS_CHANGED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'SESSION_REVOKED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'EXPORT_GENERATED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'REVIEW_HIDDEN';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'REVIEW_RESTORED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'REVIEW_DELETED';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'SELLER_VERIFICATION_REVIEWED';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DROP THE PLATFORM APPLICATION'S OWN TABLES
--     - platform_users / platform_roles / platform_permissions :
--         Platform RBAC (replaced by admin_roles)
--     - features : the Platform feature-flag registry (explicitly removed)
--     - audit_trails : Platform audit log (Admin uses admin_actions)
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE "_PlatformRolePermissions";
DROP TABLE "platform_permissions";
DROP TABLE "platform_roles";
DROP TABLE "platform_users";
DROP TABLE "features";
DROP TABLE "audit_trails";

DROP TYPE "PlatformUserStatus";
DROP TYPE "PlatformRoleType";
