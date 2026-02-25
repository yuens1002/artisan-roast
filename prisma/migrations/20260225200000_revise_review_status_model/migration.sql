-- Delete any REMOVED reviews (hard delete replaces soft-remove)
DELETE FROM "Review" WHERE "status" = 'REMOVED';

-- Recreate ReviewStatus enum: replace REMOVED with PENDING
CREATE TYPE "ReviewStatus_new" AS ENUM ('PUBLISHED', 'FLAGGED', 'PENDING');
ALTER TABLE "Review" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Review" ALTER COLUMN "status" TYPE "ReviewStatus_new" USING "status"::text::"ReviewStatus_new";
ALTER TABLE "Review" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
DROP TYPE "ReviewStatus";
ALTER TYPE "ReviewStatus_new" RENAME TO "ReviewStatus";

-- Add adminResponse to Review
ALTER TABLE "Review" ADD COLUMN "adminResponse" TEXT;

-- Add reviewsLastViewedAt to User
ALTER TABLE "User" ADD COLUMN "reviewsLastViewedAt" TIMESTAMP(3);
