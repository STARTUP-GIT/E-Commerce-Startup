-- AlterTable
ALTER TABLE "seller_addresses" ADD COLUMN IF NOT EXISTS "doorNo" VARCHAR(100);
ALTER TABLE "seller_addresses" ADD COLUMN IF NOT EXISTS "buildingName" VARCHAR(200);
ALTER TABLE "seller_addresses" ADD COLUMN IF NOT EXISTS "street" VARCHAR(200);
ALTER TABLE "seller_addresses" ADD COLUMN IF NOT EXISTS "cross" VARCHAR(200);
ALTER TABLE "seller_addresses" ADD COLUMN IF NOT EXISTS "area" VARCHAR(200);
ALTER TABLE "seller_addresses" ADD COLUMN IF NOT EXISTS "landmark" VARCHAR(200);
ALTER TABLE "seller_addresses" ADD COLUMN IF NOT EXISTS "locationSource" VARCHAR(50);
ALTER TABLE "seller_addresses" ADD COLUMN IF NOT EXISTS "accuracyMeters" DOUBLE PRECISION;
