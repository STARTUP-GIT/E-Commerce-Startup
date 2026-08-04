-- =============================================================================
-- Rework feature flags: generic LaunchDarkly-style FeatureFlag is replaced by
-- a code-driven Feature registry.
--
--   Feature  : featureKey, application, displayName, enabled, createdAt, updatedAt
--
-- Existing feature_flags rows are migrated (enabled state preserved). Old
-- table and obsolete enums are dropped. Nothing here deletes platform data.
-- =============================================================================

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "featureKey" VARCHAR(80) NOT NULL,
    "application" VARCHAR(40) NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- Migrate existing feature flags, preserving their enabled state.
INSERT INTO "features" ("id", "featureKey", "application", "displayName", "enabled", "createdAt", "updatedAt")
SELECT
    "id",
    "key",
    CASE WHEN "scope" = 'SELLER' THEN 'SELLER' ELSE 'CUSTOMER' END,
    "displayName",
    "enabled",
    "createdAt",
    "updatedAt"
FROM "feature_flags";

-- CreateIndex
CREATE UNIQUE INDEX "features_featureKey_application_key" ON "features"("featureKey", "application");
CREATE INDEX "features_application_idx" ON "features"("application");
CREATE INDEX "features_enabled_idx" ON "features"("enabled");

-- DropTable
DROP TABLE "feature_flags";

-- Drop obsolete enums
DROP TYPE "FeatureFlagType";
DROP TYPE "FeatureFlagStatus";
DROP TYPE "FeatureFlagScope";
