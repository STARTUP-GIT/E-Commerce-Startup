-- AlterTable
ALTER TABLE "marketplace_branding"
ADD COLUMN IF NOT EXISTS "darkLogoUrl" VARCHAR(2048),
ADD COLUMN IF NOT EXISTS "darkLogoPublicId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "lightLogoUrl" VARCHAR(2048),
ADD COLUMN IF NOT EXISTS "lightLogoPublicId" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "brandDescription" TEXT,
ADD COLUMN IF NOT EXISTS "customerTitle" VARCHAR(200),
ADD COLUMN IF NOT EXISTS "sellerPortalTitle" VARCHAR(200),
ADD COLUMN IF NOT EXISTS "sellerPortalTagline" VARCHAR(300),
ADD COLUMN IF NOT EXISTS "sellerPortalLogoUrl" VARCHAR(2048),
ADD COLUMN IF NOT EXISTS "sellerPortalLogoPublicId" VARCHAR(255);

-- Cleanse stale seed tagline on SELLER row if present
UPDATE "marketplace_branding"
SET "tagline" = 'Manage your storefront, products, and incoming orders.'
WHERE "app" = 'SELLER' AND "tagline" = 'Grow your store locally';
