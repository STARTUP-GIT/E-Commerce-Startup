/*
  Warnings:

  - The values [READY_FOR_PICKUP] on the enum `CustomOrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CustomOrderStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'QUOTING', 'QUOTED', 'QUOTE_ACCEPTED', 'QUOTE_REJECTED', 'IN_PRODUCTION', 'QUALITY_CHECK', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'EXPIRED');
ALTER TABLE "public"."custom_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "custom_orders" ALTER COLUMN "status" TYPE "CustomOrderStatus_new" USING ("status"::text::"CustomOrderStatus_new");
ALTER TYPE "CustomOrderStatus" RENAME TO "CustomOrderStatus_old";
ALTER TYPE "CustomOrderStatus_new" RENAME TO "CustomOrderStatus";
DROP TYPE "public"."CustomOrderStatus_old";
ALTER TABLE "custom_orders" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;
