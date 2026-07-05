-- ============================================================
-- Migration: Sync SellerStatus and ShopStatus enums + columns
-- ============================================================

-- 1. SellerStatus: add new values (safe via DO block for idempotency)
DO $$ BEGIN
    ALTER TYPE "SellerStatus" ADD VALUE 'ACTIVE';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TYPE "SellerStatus" ADD VALUE 'DISABLED';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Migrate existing seller rows from old → new status values
UPDATE "sellers" SET "status" = 'ACTIVE'   WHERE "status" IN ('PENDING_VERIFICATION', 'PENDING_APPROVAL', 'APPROVED');
UPDATE "sellers" SET "status" = 'DISABLED' WHERE "status" IN ('REJECTED', 'SUSPENDED');

-- 3. Create ShopStatus enum type (idempotent via DO block)
DO $$ BEGIN
    CREATE TYPE "ShopStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'DISABLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 4. Add status column to shops table
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "status" "ShopStatus" NOT NULL DEFAULT 'PENDING';

-- 5. Migrate isActive boolean → status enum
UPDATE "shops" SET "status" = 'APPROVED' WHERE "isActive" = true;
UPDATE "shops" SET "status" = 'PENDING'  WHERE "isActive" = false AND "status" = 'PENDING';

-- 6. Add gstNumber column and migrate data from taxId
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "gstNumber" VARCHAR(15);
UPDATE "shops" SET "gstNumber" = "taxId" WHERE "taxId" IS NOT NULL AND "gstNumber" IS NULL;

-- 7. Add remaining columns that exist in Prisma schema but are missing from DB
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "rejectionReason"  TEXT;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "reviewedByAdminId" VARCHAR(30);
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "reviewedAt"        TIMESTAMP(3);

-- 8. Keep isActive and taxId for backward compatibility (will be dropped in future cleanup)
-- The app now uses status and gstNumber; old columns are unused by Prisma.

-- 9. Ensure indexes exist for new columns
CREATE INDEX IF NOT EXISTS "shops_status_idx" ON "shops"("status");
