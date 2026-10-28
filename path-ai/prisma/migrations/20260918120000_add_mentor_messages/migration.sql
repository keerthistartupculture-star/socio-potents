-- CreateEnum
CREATE TYPE "MentorMessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "mentor_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MentorMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentor_messages_userId_createdAt_idx" ON "mentor_messages"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "mentor_messages" ADD CONSTRAINT "mentor_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
