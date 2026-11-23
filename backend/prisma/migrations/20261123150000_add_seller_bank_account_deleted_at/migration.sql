-- AlterTable
ALTER TABLE "seller_bank_accounts" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "seller_bank_accounts_sellerId_deletedAt_idx" ON "seller_bank_accounts"("sellerId", "deletedAt");
