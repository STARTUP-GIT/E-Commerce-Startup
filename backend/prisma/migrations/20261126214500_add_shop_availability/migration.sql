-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SHOP_SCHEDULED_CLOSE_ALERT';
ALTER TYPE "NotificationType" ADD VALUE 'SHOP_SCHEDULED_CLOSED';

-- AlterEnum
ALTER TYPE "AdminActionType" ADD VALUE 'SHOP_AVAILABILITY_OVERRIDDEN';

-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "closingReason" TEXT,
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "lastStatusChangedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastStatusChangeSource" TEXT DEFAULT 'SELLER_MANUAL',
ADD COLUMN     "lastStatusChangedBy" TEXT,
ADD COLUMN     "scheduledCloseAt" TIMESTAMP(3),
ADD COLUMN     "scheduledCloseReason" TEXT,
ADD COLUMN     "scheduledCloseNoticeSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

-- CreateTable
CREATE TABLE "shop_availability_logs" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "reason" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_availability_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_availability_logs_shopId_idx" ON "shop_availability_logs"("shopId");
CREATE INDEX "shop_availability_logs_createdAt_idx" ON "shop_availability_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "shop_availability_logs" ADD CONSTRAINT "shop_availability_logs_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
