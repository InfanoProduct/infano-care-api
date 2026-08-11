-- =====================================================================
-- Migration: lms_and_sos_updates
-- Created: 2026-08-11
-- Description:
--   1. Adds LMS (Learning Management System) models:
--      LmsCourse, LmsModule, LmsChapter, LmsVideo, LmsAssessment,
--      LmsEnrollment, LmsProgress + LmsChapterType enum
--   2. Adds lmsEnrollments relation on User
--   3. Adds isTest column to SosIncident
--   4. Adds consentSentAt column to TrustedContact
--   5. Drops deprecated UserSosPreference table & emergencyType column
-- =====================================================================

-- CreateEnum
CREATE TYPE "LmsChapterType" AS ENUM ('VIDEO', 'ASSESSMENT');

-- AlterTable: Add isTest to SosIncident
ALTER TABLE "SosIncident" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add consentSentAt to TrustedContact
ALTER TABLE "TrustedContact" ADD COLUMN "consentSentAt" TIMESTAMP(3);

-- CreateTable: LmsCourse
CREATE TABLE "LmsCourse" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "timeDuration" INTEGER NOT NULL,
    "thumbnailUrl" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LmsModule
CREATE TABLE "LmsModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timeDuration" INTEGER,
    "thumbnailUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LmsChapter
CREATE TABLE "LmsChapter" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "type" "LmsChapterType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "goodToKnowPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "faqs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LmsVideo
CREATE TABLE "LmsVideo" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LmsAssessment
CREATE TABLE "LmsAssessment" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "questions" JSONB NOT NULL DEFAULT '[]',
    "passingScore" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LmsEnrollment
CREATE TABLE "LmsEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "pricePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LmsProgress
CREATE TABLE "LmsProgress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "answers" JSONB,
    "watchTime" INTEGER,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LmsModule_courseId_idx" ON "LmsModule"("courseId");

-- CreateIndex
CREATE INDEX "LmsChapter_moduleId_idx" ON "LmsChapter"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "LmsVideo_chapterId_key" ON "LmsVideo"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "LmsAssessment_chapterId_key" ON "LmsAssessment"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "LmsEnrollment_userId_courseId_key" ON "LmsEnrollment"("userId", "courseId");

-- CreateIndex
CREATE INDEX "LmsEnrollment_userId_idx" ON "LmsEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LmsProgress_enrollmentId_chapterId_key" ON "LmsProgress"("enrollmentId", "chapterId");

-- AddForeignKey
ALTER TABLE "LmsModule" ADD CONSTRAINT "LmsModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LmsCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsChapter" ADD CONSTRAINT "LmsChapter_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LmsModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsVideo" ADD CONSTRAINT "LmsVideo_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "LmsChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsAssessment" ADD CONSTRAINT "LmsAssessment_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "LmsChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsEnrollment" ADD CONSTRAINT "LmsEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LmsCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsEnrollment" ADD CONSTRAINT "LmsEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsProgress" ADD CONSTRAINT "LmsProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "LmsEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsProgress" ADD CONSTRAINT "LmsProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "LmsChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
