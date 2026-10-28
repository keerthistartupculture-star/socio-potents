-- AlterTable
ALTER TABLE "mentor_messages" ADD COLUMN "flagReason" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" TEXT;

-- AlterTable
ALTER TABLE "careers" ADD COLUMN "contentReviewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "mentor_messages_flagReason_reviewedAt_idx" ON "mentor_messages"("flagReason", "reviewedAt");
