-- ============================================================
-- Migration: Sync SellerStatus and ShopStatus enums + columns
-- ============================================================
-- PostgreSQL prohibits using ALTER TYPE ADD VALUE inside a
-- transaction block when the new value is subsequently used in
-- data manipulation (UPDATE / INSERT / DEFAULT).  Prisma wraps
-- every migration in a transaction, so ADD VALUE is unsafe here.
--
-- Strategy: rename–create–drop (PostgreSQL recommended)
--   1. Rename old enum → "SellerStatus_old"
--   2. CREATE TYPE "SellerStatus" with final values
--   3. Drop column default (references old type)
--   4. ALTER COLUMN … TYPE … USING CASE …  (row-by-row mapping)
--   5. Restore default
--   6. DROP TYPE the old enum
-- ============================================================

-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-- Part 1 — SellerStatus (rename / create / cast / drop)
-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

-- 1a. Rename the existing enum so we can reuse "SellerStatus"
ALTER TYPE "SellerStatus" RENAME TO "SellerStatus_old";

-- 1b. Create the new enum with only the values Prisma expects
CREATE TYPE "SellerStatus" AS ENUM ('ACTIVE', 'DISABLED', 'BANNED');

-- 1c. Drop the column default so the old type reference is gone
ALTER TABLE "sellers" ALTER COLUMN "status" DROP DEFAULT;

-- 1d. Cast the column.
--     PostgreSQL converts every stored value through the USING
--     expression; rows whose old value has no match get ACTIVE.
--     This preserves every existing row — nothing is deleted.
ALTER TABLE "sellers"
    ALTER COLUMN "status" TYPE "SellerStatus"
    USING CASE "status"::text
        WHEN 'PENDING_VERIFICATION' THEN 'ACTIVE'::"SellerStatus"
        WHEN 'PENDING_APPROVAL'     THEN 'ACTIVE'::"SellerStatus"
        WHEN 'APPROVED'             THEN 'ACTIVE'::"SellerStatus"
        WHEN 'REJECTED'             THEN 'DISABLED'::"SellerStatus"
        WHEN 'SUSPENDED'            THEN 'DISABLED'::"SellerStatus"
        WHEN 'BANNED'               THEN 'BANNED'::"SellerStatus"
        ELSE 'ACTIVE'::"SellerStatus"
    END;

-- 1e. Restore a default that matches the new Prisma schema
ALTER TABLE "sellers" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- 1f. Drop the old enum (no column references it anymore)
DROP TYPE IF EXISTS "SellerStatus_old";

-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-- Part 2 — ShopStatus (fresh CREATE TYPE, no rename needed)
-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-- CREATE TYPE is NOT affected by the transaction restriction
-- that ALTER TYPE ADD VALUE has, so a DO block is safe here.

DO $$ BEGIN
    CREATE TYPE "ShopStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'DISABLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2a. Add status column (migrate isActive → status later)
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "status" "ShopStatus" NOT NULL DEFAULT 'PENDING';

-- 2b. Migrate existing isActive boolean to status enum
UPDATE "shops" SET "status" = 'APPROVED' WHERE "isActive" = true;
UPDATE "shops" SET "status" = 'PENDING'  WHERE "isActive" = false AND "status" = 'PENDING';

-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-- Part 3 — Columns the Prisma Shop model expects but that are
--           missing from the physical shops table
-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

-- 3a. gstNumber (Prisma model has it; DB has legacy taxId)
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "gstNumber" VARCHAR(15);

-- Only update from taxId if the column exists in the database
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='shops' AND column_name='taxId'
    ) THEN
        EXECUTE 'UPDATE "shops" SET "gstNumber" = "taxId" WHERE "taxId" IS NOT NULL AND "gstNumber" IS NULL';
    END IF;
END $$;

-- 3b. Columns referenced by the Shop model
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "rejectionReason"  TEXT;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "reviewedByAdminId" VARCHAR(30);
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "reviewedAt"        TIMESTAMP(3);

-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
-- Part 4 — Indexes
-- ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

-- 4a. Drop legacy index on isActive (column deprecated)
DROP INDEX IF EXISTS "shops_isActive_idx";

-- 4b. Index for the new status column
CREATE INDEX IF NOT EXISTS "shops_status_idx" ON "shops"("status");

-- Note: sellers_status_idx is automatically updated when the column
-- type is altered; no explicit reindex is required.
