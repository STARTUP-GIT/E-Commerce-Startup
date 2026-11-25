-- CreateEnum
CREATE TYPE "FulfilmentType" AS ENUM ('READY_TO_SHIP', 'MADE_TO_ORDER');

-- CreateEnum
CREATE TYPE "PrepTimeType" AS ENUM ('CALENDAR_DAYS', 'BUSINESS_DAYS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ORDER_PREPARATION_STARTED';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_READY_FOR_PICKUP';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_PREPARATION_DELAY';
ALTER TYPE "NotificationType" ADD VALUE 'ORDER_DEADLINE_APPROACHING';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "estimatedReadyDate" TIMESTAMP(3),
ADD COLUMN     "fulfilmentType" "FulfilmentType" DEFAULT 'READY_TO_SHIP',
ADD COLUMN     "maxPrepDays" INTEGER,
ADD COLUMN     "minPrepDays" INTEGER,
ADD COLUMN     "prepTimeType" "PrepTimeType" DEFAULT 'BUSINESS_DAYS',
ADD COLUMN     "productionNotes" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "activeProductionOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fulfilmentType" "FulfilmentType" NOT NULL DEFAULT 'READY_TO_SHIP',
ADD COLUMN     "maxConcurrentOrders" INTEGER,
ADD COLUMN     "maxPrepDays" INTEGER,
ADD COLUMN     "minPrepDays" INTEGER,
ADD COLUMN     "prepTimeType" "PrepTimeType" DEFAULT 'BUSINESS_DAYS',
ADD COLUMN     "productionNotes" TEXT;

-- AlterTable
ALTER TABLE "seller_orders" ADD COLUMN     "preparationStartedAt" TIMESTAMP(3),
ADD COLUMN     "targetReadyDate" TIMESTAMP(3);
