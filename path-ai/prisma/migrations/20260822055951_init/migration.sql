-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('CLASS_10', 'CLASS_12', 'DIPLOMA', 'UNDERGRADUATE', 'POSTGRADUATE', 'WORKING_PROFESSIONAL');

-- CreateEnum
CREATE TYPE "AssessmentFramework" AS ENUM ('BIG_FIVE', 'MBTI');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "InputMethod" AS ENUM ('VOICE', 'TEXT', 'MIXED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SCENARIO', 'OPEN_ENDED', 'MULTIPLE_CHOICE', 'VOICE', 'TEXT', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPER_ADMIN', 'COUNSELOR');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('DATA_PROCESSING', 'VOICE_PROCESSING', 'ANALYTICS', 'GUARDIAN_MINOR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "age" INTEGER,
    "gender" "Gender",
    "location" TEXT,
    "educationLevel" "EducationLevel" NOT NULL,
    "institutionName" TEXT,
    "currentClassYear" TEXT,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "careerGoal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guardianName" TEXT,
    "guardianEmail" TEXT,
    "guardianRelation" TEXT,
    "guardianConsent" BOOLEAN NOT NULL DEFAULT false,
    "guardianConsentAt" TIMESTAMP(3),
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "learningPreferences" TEXT,
    "workEnvironmentPref" TEXT,
    "motivation" TEXT,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "developmentAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentRole" TEXT,
    "experienceYears" INTEGER,
    "careerSatisfaction" INTEGER,
    "leadershipPreference" TEXT,
    "workStyle" TEXT,
    "communicationStyle" TEXT,
    "managementVsIC" TEXT,
    "entrepreneurshipInterest" BOOLEAN,
    "careerTransitionInterest" BOOLEAN,
    "longTermAmbition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "guardianName" TEXT,
    "guardianRelation" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "framework" "AssessmentFramework" NOT NULL,
    "educationLevelAtTime" "EducationLevel" NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "assessmentVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "questionBankVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "promptVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "aiModelVersion" TEXT NOT NULL DEFAULT 'gemini-3.6-flash',
    "scoringAlgorithmVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_sessions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "conversationState" JSONB NOT NULL DEFAULT '{}',
    "questionsAskedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastQuestionId" TEXT,
    "inputMethodUsed" "InputMethod" NOT NULL DEFAULT 'TEXT',
    "voiceStartedCount" INTEGER NOT NULL DEFAULT 0,
    "voiceCompletedCount" INTEGER NOT NULL DEFAULT 0,
    "voiceErrorCount" INTEGER NOT NULL DEFAULT 0,
    "pauseCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_progress" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "reached25At" TIMESTAMP(3),
    "reached50At" TIMESTAMP(3),
    "reached75At" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reportGeneratedAt" TIMESTAMP(3),
    "reportViewedAt" TIMESTAMP(3),

    CONSTRAINT "assessment_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "framework" "AssessmentFramework" NOT NULL,
    "dimension" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "scenarioText" TEXT NOT NULL,
    "isScenario" BOOLEAN NOT NULL DEFAULT true,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "educationLevels" "EducationLevel"[],
    "followUpOfId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_responses" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT,
    "questionTextSnapshot" TEXT NOT NULL,
    "responseText" TEXT NOT NULL,
    "inputMethod" "InputMethod" NOT NULL,
    "dimensionSignals" JSONB NOT NULL DEFAULT '{}',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiReasoningSummary" TEXT,
    "followUpNeeded" BOOLEAN NOT NULL DEFAULT false,
    "followUpQuestion" TEXT,
    "order" INTEGER NOT NULL,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,

    CONSTRAINT "question_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_transcripts" (
    "id" TEXT NOT NULL,
    "questionResponseId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "audioRetained" BOOLEAN NOT NULL DEFAULT false,
    "sttProvider" TEXT NOT NULL DEFAULT 'web-speech-api',
    "sttConfidence" DOUBLE PRECISION,
    "processingTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personality_scores" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "framework" "AssessmentFramework" NOT NULL,
    "bigFive" JSONB,
    "mbti" JSONB,
    "mbtiType" TEXT,
    "confidenceOverall" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personality_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,

    CONSTRAINT "career_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "careers" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "personalityAlignment" JSONB NOT NULL DEFAULT '{}',
    "skillsRequired" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "educationPathway" JSONB NOT NULL DEFAULT '[]',
    "entryLevelRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "growthPath" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workEnvironment" TEXT,
    "challenges" TEXT,
    "futureOutlook" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "careers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_skills" (
    "id" TEXT NOT NULL,
    "careerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "career_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "career_recommendations" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "careerId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "reasoning" JSONB NOT NULL DEFAULT '{}',
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skillGaps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "career_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportJson" JSONB NOT NULL,
    "reportVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "status" "ReportStatus" NOT NULL DEFAULT 'GENERATING',
    "personalityResultLabel" TEXT,
    "pdfPath" TEXT,
    "generatedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counselor_notes" (
    "id" TEXT NOT NULL,
    "counselorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "counselor_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventName" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_educationLevel_idx" ON "users"("educationLevel");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "consent_records_userId_idx" ON "consent_records"("userId");

-- CreateIndex
CREATE INDEX "assessments_userId_idx" ON "assessments"("userId");

-- CreateIndex
CREATE INDEX "assessments_status_idx" ON "assessments"("status");

-- CreateIndex
CREATE INDEX "assessments_framework_idx" ON "assessments"("framework");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_sessions_assessmentId_key" ON "assessment_sessions"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_progress_assessmentId_key" ON "assessment_progress"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "questions_code_key" ON "questions"("code");

-- CreateIndex
CREATE INDEX "questions_framework_dimension_idx" ON "questions"("framework", "dimension");

-- CreateIndex
CREATE INDEX "questions_isActive_idx" ON "questions"("isActive");

-- CreateIndex
CREATE INDEX "question_responses_assessmentId_idx" ON "question_responses"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "voice_transcripts_questionResponseId_key" ON "voice_transcripts"("questionResponseId");

-- CreateIndex
CREATE UNIQUE INDEX "personality_scores_assessmentId_key" ON "personality_scores"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "career_categories_name_key" ON "career_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "career_categories_slug_key" ON "career_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "careers_slug_key" ON "careers"("slug");

-- CreateIndex
CREATE INDEX "careers_categoryId_idx" ON "careers"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "career_skills_careerId_skillId_key" ON "career_skills"("careerId", "skillId");

-- CreateIndex
CREATE INDEX "career_recommendations_assessmentId_idx" ON "career_recommendations"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_assessmentId_key" ON "reports"("assessmentId");

-- CreateIndex
CREATE INDEX "reports_userId_idx" ON "reports"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "counselor_notes_userId_idx" ON "counselor_notes"("userId");

-- CreateIndex
CREATE INDEX "analytics_events_eventName_idx" ON "analytics_events"("eventName");

-- CreateIndex
CREATE INDEX "analytics_events_createdAt_idx" ON "analytics_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_progress" ADD CONSTRAINT "assessment_progress_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_followUpOfId_fkey" FOREIGN KEY ("followUpOfId") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_transcripts" ADD CONSTRAINT "voice_transcripts_questionResponseId_fkey" FOREIGN KEY ("questionResponseId") REFERENCES "question_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personality_scores" ADD CONSTRAINT "personality_scores_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "careers" ADD CONSTRAINT "careers_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "career_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_skills" ADD CONSTRAINT "career_skills_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_skills" ADD CONSTRAINT "career_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_recommendations" ADD CONSTRAINT "career_recommendations_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_recommendations" ADD CONSTRAINT "career_recommendations_careerId_fkey" FOREIGN KEY ("careerId") REFERENCES "careers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counselor_notes" ADD CONSTRAINT "counselor_notes_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counselor_notes" ADD CONSTRAINT "counselor_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counselor_notes" ADD CONSTRAINT "counselor_notes_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
