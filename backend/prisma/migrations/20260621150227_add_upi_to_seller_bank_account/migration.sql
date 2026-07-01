/*
  Warnings:

  - You are about to drop the column `currency` on the `seller_bank_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `routingNumber` on the `seller_bank_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `swiftCode` on the `seller_bank_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedAt` on the `seller_bank_accounts` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "seller_bank_accounts_sellerId_isDefault_idx";

-- AlterTable
ALTER TABLE "seller_bank_accounts" DROP COLUMN "currency",
DROP COLUMN "routingNumber",
DROP COLUMN "swiftCode",
DROP COLUMN "verifiedAt",
ADD COLUMN     "upiId" VARCHAR(100),
ALTER COLUMN "accountHolderName" DROP NOT NULL,
ALTER COLUMN "bankName" DROP NOT NULL,
ALTER COLUMN "accountNumber" DROP NOT NULL,
ALTER COLUMN "isDefault" SET DEFAULT true;
