-- AlterTable customer_addresses
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "district" VARCHAR(100);
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "formattedAddress" VARCHAR(500);
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "placeId" VARCHAR(255);

-- AlterTable seller_addresses
ALTER TABLE "seller_addresses" ADD COLUMN IF NOT EXISTS "district" VARCHAR(100);
ALTER TABLE "seller_addresses" ADD COLUMN IF NOT EXISTS "formattedAddress" VARCHAR(500);
ALTER TABLE "seller_addresses" ADD COLUMN IF NOT EXISTS "placeId" VARCHAR(255);

-- CreateTable location_notification_subscriptions
CREATE TABLE IF NOT EXISTS "location_notification_subscriptions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "email" VARCHAR(320),
    "state" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100),
    "city" VARCHAR(100),
    "postalCode" VARCHAR(20),
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "consent" BOOLEAN NOT NULL DEFAULT true,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_notification_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "location_notification_subscriptions_state_district_idx" ON "location_notification_subscriptions"("state", "district");
CREATE INDEX IF NOT EXISTS "location_notification_subscriptions_customerId_idx" ON "location_notification_subscriptions"("customerId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'location_notification_subscriptions_customerId_fkey'
    ) THEN
        ALTER TABLE "location_notification_subscriptions" 
        ADD CONSTRAINT "location_notification_subscriptions_customerId_fkey" 
        FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
