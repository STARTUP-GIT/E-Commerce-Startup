/*
  Warnings:

  - You are about to drop the column `approvedAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `approvedByAdminId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `averageRating` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `compareAtPrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `costPrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `dimensionUnit` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `hasVariants` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `isCustomManufacturable` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `length` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `lowStockThreshold` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `rejectedAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `reservedQuantity` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `reviewCount` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `shortDescription` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `totalSold` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `weightUnit` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `marketplace_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "SellerOrderStatus" ADD VALUE 'READY_TO_SHIP';

-- DropForeignKey
ALTER TABLE "marketplace_settings" DROP CONSTRAINT "marketplace_settings_updatedByAdminId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_approvedByAdminId_fkey";

-- DropIndex
DROP INDEX "products_averageRating_idx";

-- DropIndex
DROP INDEX "products_createdAt_idx";

-- DropIndex
DROP INDEX "products_name_idx";

-- DropIndex
DROP INDEX "products_price_idx";

-- DropIndex
DROP INDEX "products_publishedAt_idx";

-- DropIndex
DROP INDEX "products_stockQuantity_idx";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "approvedAt",
DROP COLUMN "approvedByAdminId",
DROP COLUMN "averageRating",
DROP COLUMN "compareAtPrice",
DROP COLUMN "costPrice",
DROP COLUMN "dimensionUnit",
DROP COLUMN "hasVariants",
DROP COLUMN "height",
DROP COLUMN "isCustomManufacturable",
DROP COLUMN "length",
DROP COLUMN "lowStockThreshold",
DROP COLUMN "publishedAt",
DROP COLUMN "rejectedAt",
DROP COLUMN "rejectionReason",
DROP COLUMN "reservedQuantity",
DROP COLUMN "reviewCount",
DROP COLUMN "shortDescription",
DROP COLUMN "totalSold",
DROP COLUMN "weight",
DROP COLUMN "weightUnit",
DROP COLUMN "width",
ALTER COLUMN "categoryId" DROP NOT NULL,
ALTER COLUMN "slug" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "sellerId" TEXT,
ALTER COLUMN "ticketNumber" DROP NOT NULL,
ALTER COLUMN "customerId" DROP NOT NULL;

-- DropTable
DROP TABLE "marketplace_settings";

-- CreateIndex
CREATE INDEX "support_tickets_sellerId_idx" ON "support_tickets"("sellerId");

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
