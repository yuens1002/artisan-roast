-- AlterTable (baseline: columns already exist in DB, IF NOT EXISTS for safety)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundReason" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundedAmountInCents" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);

-- Ensure nullable (schema says Int? not Int)
ALTER TABLE "Order" ALTER COLUMN "refundedAmountInCents" DROP NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "refundedAmountInCents" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "flagReason" TEXT;
