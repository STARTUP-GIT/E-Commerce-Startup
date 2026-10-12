-- AlterTable packing_fee_requests
ALTER TABLE "packing_fee_requests" ADD COLUMN IF NOT EXISTS "requestedMaxFee" DECIMAL(10, 2);
ALTER TABLE "packing_fee_requests" ADD COLUMN IF NOT EXISTS "approvedMaxFee" DECIMAL(10, 2);

-- AlterTable shops
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "packingFeeApprovedMaxAmount" DECIMAL(10, 2);
