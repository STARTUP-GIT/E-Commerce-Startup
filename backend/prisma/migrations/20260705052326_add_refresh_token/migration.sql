-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "packingFeeTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "platformFeeTotal" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "gstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gstPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "invoiceNumber" VARCHAR(50),
ADD COLUMN     "packingFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "platformFee" DECIMAL(12,2),
ADD COLUMN     "shippingCharge" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "reply" TEXT;

-- AlterTable
ALTER TABLE "seller_orders" ADD COLUMN     "packingFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "platformFee" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "seller_verifications" ADD COLUMN     "gstRegistered" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "commissionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
ADD COLUMN     "customerDeliveryShare" INTEGER NOT NULL DEFAULT 75,
ADD COLUMN     "enablePackingFee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gstRegistered" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "packingFeeApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellerDeliveryShare" INTEGER NOT NULL DEFAULT 25;

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" VARCHAR(200),
    "payloadHash" VARCHAR(128) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryBoy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "vehicleNumber" TEXT,
    "vehicleType" TEXT,
    "city" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rating" DOUBLE PRECISION DEFAULT 0,
    "availability" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryBoy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformDeliverySetting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "customerDeliveryShare" INTEGER NOT NULL DEFAULT 75,
    "sellerDeliveryShare" INTEGER NOT NULL DEFAULT 25,
    "defaultProvider" TEXT NOT NULL DEFAULT 'PORTER',
    "maxDeliveryRadiusMeters" INTEGER NOT NULL DEFAULT 5000,
    "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformDeliverySetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_providerEventId_idx" ON "WebhookEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_payloadHash_idx" ON "WebhookEvent"("payloadHash");
