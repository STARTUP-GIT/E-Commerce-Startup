-- CreateEnum
CREATE TYPE "PackagingOptionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "packaging_options" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "type" TEXT DEFAULT 'BOX',
    "isOptional" BOOLEAN NOT NULL DEFAULT true,
    "applicableCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PackagingOptionStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedByAdminId" VARCHAR(30),
    "reviewedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packaging_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_packaging_snapshots" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerOrderId" TEXT,
    "packagingOptionId" TEXT,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalFee" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_packaging_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "packaging_options_shopId_idx" ON "packaging_options"("shopId");

-- CreateIndex
CREATE INDEX "packaging_options_shopId_status_isActive_idx" ON "packaging_options"("shopId", "status", "isActive");

-- CreateIndex
CREATE INDEX "packaging_options_status_idx" ON "packaging_options"("status");

-- CreateIndex
CREATE INDEX "order_packaging_snapshots_orderId_idx" ON "order_packaging_snapshots"("orderId");

-- CreateIndex
CREATE INDEX "order_packaging_snapshots_sellerOrderId_idx" ON "order_packaging_snapshots"("sellerOrderId");

-- CreateIndex
CREATE INDEX "order_packaging_snapshots_packagingOptionId_idx" ON "order_packaging_snapshots"("packagingOptionId");

-- AddForeignKey
ALTER TABLE "packaging_options" ADD CONSTRAINT "packaging_options_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packaging_options" ADD CONSTRAINT "packaging_options_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_packaging_snapshots" ADD CONSTRAINT "order_packaging_snapshots_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_packaging_snapshots" ADD CONSTRAINT "order_packaging_snapshots_sellerOrderId_fkey" FOREIGN KEY ("sellerOrderId") REFERENCES "seller_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_packaging_snapshots" ADD CONSTRAINT "order_packaging_snapshots_packagingOptionId_fkey" FOREIGN KEY ("packagingOptionId") REFERENCES "packaging_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
