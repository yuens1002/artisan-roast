-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundedAmountInCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "taxAmountInCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shippingAmountInCents" INTEGER NOT NULL DEFAULT 0;
