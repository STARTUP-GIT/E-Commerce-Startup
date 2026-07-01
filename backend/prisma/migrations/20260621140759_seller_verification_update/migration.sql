/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `seller_verifications` table. All the data in the column will be lost.
  - You are about to drop the column `taxId` on the `shops` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "seller_verifications" DROP COLUMN "expiresAt",
ADD COLUMN     "gstNumber" VARCHAR(15),
ALTER COLUMN "documentType" DROP NOT NULL,
ALTER COLUMN "documentUrl" DROP NOT NULL,
ALTER COLUMN "fileName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "shops" DROP COLUMN "taxId",
ADD COLUMN     "gstNumber" VARCHAR(15);
