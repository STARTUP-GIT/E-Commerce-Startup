-- AlterTable
ALTER TABLE "cities" ADD COLUMN     "allowCustomerBrowsing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowCustomerOrdering" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowSellerRegistration" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowShopCreation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "comingSoonMessage" TEXT,
ADD COLUMN     "customerNoticeMessage" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "displayName" VARCHAR(100),
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "expectedLaunchDate" TIMESTAMP(3),
ADD COLUMN     "isCustomerEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDeliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isSellerEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "launchAnnouncement" TEXT,
ADD COLUMN     "launchStatus" TEXT NOT NULL DEFAULT 'LAUNCHED',
ADD COLUMN     "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sellerNoticeMessage" TEXT;

-- CreateTable
CREATE TABLE "city_towns" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "displayName" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "launchStatus" TEXT NOT NULL DEFAULT 'LAUNCHED',
    "info" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_towns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_areas" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "cityTownId" TEXT,
    "name" VARCHAR(100) NOT NULL,
    "postalCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "boundaries" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deliveryEligible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_requests" (
    "id" TEXT NOT NULL,
    "requestType" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "customerId" TEXT,
    "sellerId" TEXT,
    "name" VARCHAR(150),
    "email" VARCHAR(320),
    "phone" VARCHAR(30),
    "state" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100),
    "city" VARCHAR(100),
    "postalCode" VARCHAR(20),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "adminEmail" TEXT,
    "adminName" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "city_towns_districtId_idx" ON "city_towns"("districtId");

-- CreateIndex
CREATE INDEX "city_towns_isActive_idx" ON "city_towns"("isActive");

-- CreateIndex
CREATE INDEX "city_towns_launchStatus_idx" ON "city_towns"("launchStatus");

-- CreateIndex
CREATE UNIQUE INDEX "city_towns_districtId_name_key" ON "city_towns"("districtId", "name");

-- CreateIndex
CREATE INDEX "service_areas_districtId_idx" ON "service_areas"("districtId");

-- CreateIndex
CREATE INDEX "service_areas_cityTownId_idx" ON "service_areas"("cityTownId");

-- CreateIndex
CREATE INDEX "service_areas_isActive_idx" ON "service_areas"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "service_areas_districtId_name_key" ON "service_areas"("districtId", "name");

-- CreateIndex
CREATE INDEX "location_requests_state_district_idx" ON "location_requests"("state", "district");

-- CreateIndex
CREATE INDEX "location_requests_status_idx" ON "location_requests"("status");

-- CreateIndex
CREATE INDEX "location_requests_requestType_idx" ON "location_requests"("requestType");

-- CreateIndex
CREATE INDEX "location_requests_customerId_idx" ON "location_requests"("customerId");

-- CreateIndex
CREATE INDEX "location_requests_sellerId_idx" ON "location_requests"("sellerId");

-- CreateIndex
CREATE INDEX "location_requests_createdAt_idx" ON "location_requests"("createdAt");

-- CreateIndex
CREATE INDEX "location_audit_logs_entityType_entityId_idx" ON "location_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "location_audit_logs_createdAt_idx" ON "location_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "cities_state_idx" ON "cities"("state");

-- CreateIndex
CREATE INDEX "cities_launchStatus_idx" ON "cities"("launchStatus");

-- AddForeignKey
ALTER TABLE "city_towns" ADD CONSTRAINT "city_towns_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_areas" ADD CONSTRAINT "service_areas_cityTownId_fkey" FOREIGN KEY ("cityTownId") REFERENCES "city_towns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_requests" ADD CONSTRAINT "location_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_requests" ADD CONSTRAINT "location_requests_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
