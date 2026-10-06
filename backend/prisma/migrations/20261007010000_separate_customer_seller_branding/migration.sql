CREATE TYPE "BrandingApp" AS ENUM ('CUSTOMER', 'SELLER');

ALTER TABLE "marketplace_branding"
ADD COLUMN "app" "BrandingApp" NOT NULL DEFAULT 'CUSTOMER';

CREATE UNIQUE INDEX "marketplace_branding_app_key" ON "marketplace_branding"("app");

CREATE SEQUENCE "marketplace_branding_id_seq";
ALTER SEQUENCE "marketplace_branding_id_seq" OWNED BY "marketplace_branding"."id";
SELECT setval(
    '"marketplace_branding_id_seq"',
    COALESCE((SELECT MAX("id") FROM "marketplace_branding"), 1),
    EXISTS (SELECT 1 FROM "marketplace_branding")
);
ALTER TABLE "marketplace_branding"
ALTER COLUMN "id" SET DEFAULT nextval('"marketplace_branding_id_seq"');

INSERT INTO "marketplace_branding" (
    "app",
    "brandName",
    "shortName",
    "tagline",
    "logoUrl",
    "faviconUrl",
    "browserTitle",
    "seoTitle",
    "seoDescription",
    "createdAt",
    "updatedAt"
)
VALUES (
    'SELLER',
    'Marketplace Seller',
    'Seller',
    'Grow your store locally',
    '/images/logo.png',
    '/images/logo.png',
    'Marketplace Seller',
    'Marketplace Seller',
    'Manage your shop, products, orders, and sales.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("app") DO NOTHING;
