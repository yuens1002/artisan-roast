/*
  Resync `Order.refundedAmountInCents` to schema (Int @default(0), required).

  An earlier hand-edited migration left the column nullable; the schema
  meanwhile declared it `Int @default(0)`. Backfill any pre-existing NULLs
  to 0 BEFORE setting NOT NULL so the migration is safe to apply against
  environments with prior partial-state rows (production, staging,
  long-lived dev DBs).
*/
-- Backfill: ensure no NULLs remain before tightening the constraint.
UPDATE "Order" SET "refundedAmountInCents" = 0 WHERE "refundedAmountInCents" IS NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "refundedAmountInCents" SET NOT NULL,
ALTER COLUMN "refundedAmountInCents" SET DEFAULT 0;
