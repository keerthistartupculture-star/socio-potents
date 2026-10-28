-- CreateEnum
CREATE TYPE "TaskKind" AS ENUM ('PRACTICAL', 'KNOWLEDGE');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('SUBMITTED', 'MODERATED', 'AUTO_MARKED');

-- AlterEnum
ALTER TYPE "AdminRole" ADD VALUE 'TRAINER';

-- CreateTable
CREATE TABLE "pathways" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "roleLevel" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contentStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pathways_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pathway_skills" (
    "id" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "levelDescriptors" JSONB NOT NULL,
    "learningSuggestions" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "pathway_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_tasks" (
    "id" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "TaskKind" NOT NULL,
    "variantGroup" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "skillCodes" TEXT[],
    "rubric" JSONB NOT NULL DEFAULT '[]',
    "options" JSONB,
    "answerIndex" INTEGER,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "skill_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pathway_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pathwayId" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pathway_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attempts" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "response" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL,
    "isCorrect" BOOLEAN,
    "aiDraft" JSONB,
    "finalMarks" JSONB,
    "trainerNote" TEXT,
    "moderatedById" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pathways_slug_key" ON "pathways"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "pathway_skills_pathwayId_code_key" ON "pathway_skills"("pathwayId", "code");

-- CreateIndex
CREATE INDEX "skill_tasks_pathwayId_variant_idx" ON "skill_tasks"("pathwayId", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "skill_tasks_pathwayId_code_key" ON "skill_tasks"("pathwayId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "pathway_enrollments_userId_pathwayId_key" ON "pathway_enrollments"("userId", "pathwayId");

-- CreateIndex
CREATE INDEX "task_attempts_status_idx" ON "task_attempts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "task_attempts_enrollmentId_taskId_key" ON "task_attempts"("enrollmentId", "taskId");

-- AddForeignKey
ALTER TABLE "pathway_skills" ADD CONSTRAINT "pathway_skills_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "pathways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_tasks" ADD CONSTRAINT "skill_tasks_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "pathways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathway_enrollments" ADD CONSTRAINT "pathway_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathway_enrollments" ADD CONSTRAINT "pathway_enrollments_pathwayId_fkey" FOREIGN KEY ("pathwayId") REFERENCES "pathways"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "pathway_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attempts" ADD CONSTRAINT "task_attempts_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "skill_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

