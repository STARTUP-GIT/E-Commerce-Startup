ALTER TABLE "admins" ADD COLUMN "avatarPublicId" VARCHAR(255);
ALTER TABLE "categories" ADD COLUMN "imagePublicId" VARCHAR(255);
ALTER TABLE "content_blocks" ADD COLUMN "imagePublicId" VARCHAR(255);
ALTER TABLE "marketplace_branding"
    ADD COLUMN "logoPublicId" VARCHAR(255),
    ADD COLUMN "faviconPublicId" VARCHAR(255);
