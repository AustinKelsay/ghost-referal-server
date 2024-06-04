-- AlterTable
ALTER TABLE "Referrer" ADD COLUMN "successfulReferrals" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Referee" ADD COLUMN "rewarded" BOOLEAN NOT NULL DEFAULT false;

-- Update successful referrals for referrers with no referees
UPDATE "Referrer"
SET "successfulReferrals" = 1
WHERE NOT EXISTS (
  SELECT 1
  FROM "Referee"
  WHERE "Referee"."referrerId" = "Referrer"."id"
);