-- AlterTable: Add COD collection tracking fields to orders
ALTER TABLE "orders" ADD COLUMN "codCollected" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "codCollectedAt" TIMESTAMP(3),
    ADD COLUMN "codCollectedBy" VARCHAR(50);
