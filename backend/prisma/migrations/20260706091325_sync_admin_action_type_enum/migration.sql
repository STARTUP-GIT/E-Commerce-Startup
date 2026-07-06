-- ============================================================
-- Migration: Sync AdminActionType enum with Prisma schema
-- ============================================================
-- The init migration created AdminActionType with SELLER_APPROVED
-- and SELLER_REJECTED. The Prisma schema was later updated to use
-- SHOP_APPROVED and SHOP_REJECTED (plus SHOP_SUSPENDED, SHOP_DISABLED),
-- but no migration was applied — leaving the production DB enum and
-- any existing rows out of sync with the generated Prisma Client.
--
-- This migration brings the PostgreSQL enum into alignment with the
-- current Prisma schema using the rename–create–cast–drop strategy.
-- ============================================================

-- Step 1: Rename the old enum so we can create a new one with the
--         same name and all the correct values.
ALTER TYPE "AdminActionType" RENAME TO "AdminActionType_old";

-- Step 2: Create the new enum exactly matching the current Prisma schema.
CREATE TYPE "AdminActionType" AS ENUM (
    'SHOP_APPROVED',
    'SHOP_REJECTED',
    'SHOP_SUSPENDED',
    'SHOP_DISABLED',
    'SELLER_BANNED',
    'SELLER_UNBANNED',
    'SELLER_STRIKE_ISSUED',
    'CUSTOMER_BANNED',
    'CUSTOMER_UNBANNED',
    'PRODUCT_APPROVED',
    'PRODUCT_REJECTED',
    'PRODUCT_REMOVED',
    'PRODUCT_REPORT_REVIEWED',
    'RETURN_APPROVED',
    'RETURN_REJECTED',
    'DELIVERY_PARTNER_CREATED',
    'DELIVERY_PARTNER_UPDATED',
    'DELIVERY_PARTNER_DEACTIVATED',
    'MARKETPLACE_SETTINGS_UPDATED',
    'CATEGORY_CREATED',
    'CATEGORY_UPDATED',
    'CATEGORY_DELETED',
    'SELLER_PAYOUT_PROCESSED',
    'COUPON_CREATED',
    'COUPON_DEACTIVATED',
    'SUPPORT_TICKET_RESOLVED'
);

-- Step 3: Drop the column default (it references the old type).
ALTER TABLE "admin_actions" ALTER COLUMN "actionType" DROP DEFAULT;

-- Step 4: Cast every row to the new enum, mapping removed values to
--         their replacements.  All other values share the same name
--         in both enums, so they cast directly.
ALTER TABLE "admin_actions"
    ALTER COLUMN "actionType" TYPE "AdminActionType"
    USING CASE "actionType"::text
        WHEN 'SELLER_APPROVED' THEN 'SHOP_APPROVED'::"AdminActionType"
        WHEN 'SELLER_REJECTED' THEN 'SHOP_REJECTED'::"AdminActionType"
        ELSE "actionType"::text::"AdminActionType"
    END;

-- Step 5: Drop the old enum — no column references it anymore.
DROP TYPE "AdminActionType_old";
