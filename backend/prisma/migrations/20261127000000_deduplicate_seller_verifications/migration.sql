-- AlterTable: Add columns for deduplication and versioning
ALTER TABLE "seller_verifications" ADD COLUMN IF NOT EXISTS "isCurrent" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "seller_verifications" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "seller_verifications" ADD COLUMN IF NOT EXISTS "submissionHistory" JSONB;

-- Reversible deduplication of existing records:
-- For any seller with multiple verification entries, keep the authoritative record as isCurrent = true
-- and mark historical/duplicate entries as isCurrent = false, preserving all audit and document history.
WITH RankedVerifications AS (
    SELECT
        id,
        "sellerId",
        ROW_NUMBER() OVER (
            PARTITION BY "sellerId"
            ORDER BY
                CASE "status"
                    WHEN 'APPROVED' THEN 4
                    WHEN 'UNDER_REVIEW' THEN 3
                    WHEN 'PENDING' THEN 2
                    WHEN 'REJECTED' THEN 1
                    ELSE 0
                END DESC,
                "reviewedAt" DESC NULLS LAST,
                "updatedAt" DESC,
                "submittedAt" DESC,
                "createdAt" DESC,
                "id" DESC
        ) AS rank,
        COUNT(*) OVER (PARTITION BY "sellerId") as total_for_seller
    FROM "seller_verifications"
)
UPDATE "seller_verifications" sv
SET
    "isCurrent" = CASE WHEN rv.rank = 1 THEN true ELSE false END,
    "version" = rv.rank
FROM RankedVerifications rv
WHERE sv.id = rv.id AND rv.total_for_seller > 1;

-- Create index on sellerId + isCurrent
CREATE INDEX IF NOT EXISTS "seller_verifications_sellerId_isCurrent_idx" ON "seller_verifications"("sellerId", "isCurrent");

-- Enforce database uniqueness constraint: Exactly one current verification per seller
CREATE UNIQUE INDEX IF NOT EXISTS "seller_verifications_seller_current_unique"
ON "seller_verifications" ("sellerId")
WHERE ("isCurrent" = true);
