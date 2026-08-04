-- CreateEnum
CREATE TYPE "FeatureFlagStatus" AS ENUM ('ENABLED', 'DISABLED', 'INTERNAL', 'BETA', 'SCHEDULED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "FeatureFlagScope" AS ENUM ('GLOBAL', 'CUSTOMER', 'SELLER', 'ADMIN', 'PLATFORM', 'SHOP', 'USER');

-- CreateEnum
CREATE TYPE "FeatureFlagType" AS ENUM ('BUY_NOW', 'WISHLIST', 'REVIEWS', 'CHAT', 'COUPONS', 'AI_SEARCH', 'RECOMMENDATIONS', 'OTP_LOGIN', 'GOOGLE_LOGIN', 'APPLE_LOGIN', 'RAZORPAY', 'UPI', 'WALLET', 'CUSTOM_PRINT', 'THREE_D_PREVIEW', 'SUBSCRIPTIONS', 'FLASH_SALE', 'BLOG', 'NEWSLETTER', 'LIVE_TRACKING', 'NOTIFICATIONS');

-- CreateEnum
CREATE TYPE "PlatformUserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'LOCKED');

-- CreateEnum
CREATE TYPE "PlatformRoleType" AS ENUM ('OWNER', 'ADMINISTRATOR', 'DEVELOPER', 'DEVOPS', 'CUSTOM');

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "type" "FeatureFlagType" NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "FeatureFlagStatus" NOT NULL DEFAULT 'DISABLED',
    "scope" "FeatureFlagScope" NOT NULL DEFAULT 'GLOBAL',
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 100,
    "targetEnvironment" VARCHAR(50),
    "scheduledAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdBy" VARCHAR(80),
    "updatedBy" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255),
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "avatarUrl" VARCHAR(2048),
    "phone" VARCHAR(20),
    "status" "PlatformUserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "roleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_roles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "type" "PlatformRoleType" NOT NULL DEFAULT 'CUSTOM',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_permissions" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(60) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_trails" (
    "id" TEXT NOT NULL,
    "userId" VARCHAR(40),
    "email" VARCHAR(320),
    "action" VARCHAR(80) NOT NULL,
    "module" VARCHAR(60) NOT NULL,
    "targetType" VARCHAR(50) NOT NULL,
    "targetId" VARCHAR(60),
    "description" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(512),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_trails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PlatformRolePermissions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PlatformRolePermissions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_type_idx" ON "feature_flags"("type");

-- CreateIndex
CREATE INDEX "feature_flags_status_idx" ON "feature_flags"("status");

-- CreateIndex
CREATE INDEX "feature_flags_scope_idx" ON "feature_flags"("scope");

-- CreateIndex
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE INDEX "platform_users_email_idx" ON "platform_users"("email");

-- CreateIndex
CREATE INDEX "platform_users_status_idx" ON "platform_users"("status");

-- CreateIndex
CREATE INDEX "platform_users_roleId_idx" ON "platform_users"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "platform_roles_name_key" ON "platform_roles"("name");

-- CreateIndex
CREATE INDEX "platform_roles_type_idx" ON "platform_roles"("type");

-- CreateIndex
CREATE UNIQUE INDEX "platform_permissions_key_key" ON "platform_permissions"("key");

-- CreateIndex
CREATE INDEX "platform_permissions_module_idx" ON "platform_permissions"("module");

-- CreateIndex
CREATE INDEX "audit_trails_userId_idx" ON "audit_trails"("userId");

-- CreateIndex
CREATE INDEX "audit_trails_action_idx" ON "audit_trails"("action");

-- CreateIndex
CREATE INDEX "audit_trails_module_idx" ON "audit_trails"("module");

-- CreateIndex
CREATE INDEX "audit_trails_targetType_targetId_idx" ON "audit_trails"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_trails_createdAt_idx" ON "audit_trails"("createdAt");

-- CreateIndex
CREATE INDEX "_PlatformRolePermissions_B_index" ON "_PlatformRolePermissions"("B");

-- AddForeignKey
ALTER TABLE "platform_users" ADD CONSTRAINT "platform_users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "platform_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlatformRolePermissions" ADD CONSTRAINT "_PlatformRolePermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "platform_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlatformRolePermissions" ADD CONSTRAINT "_PlatformRolePermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "platform_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
