/*
  Warnings:

  - You are about to drop the column `banReason` on the `shops` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `shops` table. All the data in the column will be lost.
  - You are about to drop the column `isBanned` on the `shops` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SHOP_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'SHOP_REJECTED';

-- DropIndex
DROP INDEX "seller_strikes_sellerId_isActive_idx";

-- AlterTable
ALTER TABLE "custom_order_quotes" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "seller_payouts" ALTER COLUMN "currency" SET DEFAULT 'INR';

-- AlterTable
ALTER TABLE "shops" DROP COLUMN "banReason",
DROP COLUMN "isActive",
DROP COLUMN "isBanned";
