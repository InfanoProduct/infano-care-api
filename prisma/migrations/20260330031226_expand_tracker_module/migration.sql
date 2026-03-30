/*
  Warnings:

  - The values [ACTIVE,WAITING] on the enum `TrackerMode` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `energy` on the `CycleLog` table. All the data in the column will be lost.
  - You are about to drop the column `mood` on the `CycleLog` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `CycleLog` table. All the data in the column will be lost.
  - You are about to drop the column `sleepDuration` on the `CycleLog` table. All the data in the column will be lost.
  - You are about to drop the column `avgPeriodLength` on the `CycleProfile` table. All the data in the column will be lost.
  - You are about to drop the column `cycleLengthEstimated` on the `CycleProfile` table. All the data in the column will be lost.
  - You are about to drop the column `cyclesLogged` on the `CycleProfile` table. All the data in the column will be lost.
  - You are about to drop the column `nextPeriodPredictedEnd` on the `CycleProfile` table. All the data in the column will be lost.
  - You are about to drop the column `nextPeriodPredictedStart` on the `CycleProfile` table. All the data in the column will be lost.
  - You are about to drop the column `periodLengthEstimated` on the `CycleProfile` table. All the data in the column will be lost.
  - You are about to drop the column `predictionConfidence` on the `CycleProfile` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `CycleLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TrackerMode_new" AS ENUM ('active', 'watching_waiting', 'irregular_support');
ALTER TABLE "CycleProfile" ALTER COLUMN "trackerMode" DROP DEFAULT;
ALTER TABLE "CycleProfile" ALTER COLUMN "trackerMode" TYPE "TrackerMode_new" USING ("trackerMode"::text::"TrackerMode_new");
ALTER TYPE "TrackerMode" RENAME TO "TrackerMode_old";
ALTER TYPE "TrackerMode_new" RENAME TO "TrackerMode";
DROP TYPE "TrackerMode_old";
ALTER TABLE "CycleProfile" ALTER COLUMN "trackerMode" SET DEFAULT 'watching_waiting';
COMMIT;

-- AlterTable
ALTER TABLE "CycleLog" DROP COLUMN "energy",
DROP COLUMN "mood",
DROP COLUMN "notes",
DROP COLUMN "sleepDuration",
ADD COLUMN     "activityTags" TEXT[],
ADD COLUMN     "crampIntensity" INTEGER,
ADD COLUMN     "energyLevel" INTEGER,
ADD COLUMN     "hasVoiceNote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRetroactive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moodPrimary" TEXT,
ADD COLUMN     "moodSecondary" TEXT[],
ADD COLUMN     "noteCiphertext" TEXT,
ADD COLUMN     "noteIv" TEXT,
ADD COLUMN     "nutritionTags" TEXT[],
ADD COLUMN     "sleepHours" DOUBLE PRECISION,
ADD COLUMN     "sleepQuality" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CycleProfile" DROP COLUMN "avgPeriodLength",
DROP COLUMN "cycleLengthEstimated",
DROP COLUMN "cyclesLogged",
DROP COLUMN "nextPeriodPredictedEnd",
DROP COLUMN "nextPeriodPredictedStart",
DROP COLUMN "periodLengthEstimated",
DROP COLUMN "predictionConfidence",
ADD COLUMN     "avgPeriodDuration" DOUBLE PRECISION,
ADD COLUMN     "coefficientOfVar" DOUBLE PRECISION,
ADD COLUMN     "confidenceLevel" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "currentCycleDay" INTEGER,
ADD COLUMN     "currentLogStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentPhase" TEXT NOT NULL DEFAULT 'waiting',
ADD COLUMN     "federatedLearningConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLogDate" TIMESTAMP(3),
ADD COLUMN     "longestLogStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "patternCache" JSONB,
ADD COLUMN     "predictedNextEnd" TIMESTAMP(3),
ADD COLUMN     "predictedNextStart" TIMESTAMP(3),
ADD COLUMN     "predictionWindowEarly" TIMESTAMP(3),
ADD COLUMN     "predictionWindowLate" TIMESTAMP(3),
ADD COLUMN     "showFertilityWindow" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stdCycleLength" DOUBLE PRECISION,
ALTER COLUMN "trackerMode" SET DEFAULT 'watching_waiting',
ALTER COLUMN "avgCycleLength" DROP NOT NULL,
ALTER COLUMN "avgCycleLength" DROP DEFAULT;

-- CreateTable
CREATE TABLE "CycleRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "periodStartDate" TIMESTAMP(3) NOT NULL,
    "periodEndDate" TIMESTAMP(3),
    "cycleLengthDays" INTEGER,
    "periodDurationDays" INTEGER,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "avgCrampIntensity" DOUBLE PRECISION,
    "mostCommonSymptoms" TEXT[],
    "predictedStartDate" TIMESTAMP(3),
    "predictionErrorDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CycleRecord_userId_cycleNumber_idx" ON "CycleRecord"("userId", "cycleNumber");

-- CreateIndex
CREATE INDEX "CycleLog_userId_date_idx" ON "CycleLog"("userId", "date");

-- CreateIndex
CREATE INDEX "CycleProfile_userId_idx" ON "CycleProfile"("userId");

-- AddForeignKey
ALTER TABLE "CycleRecord" ADD CONSTRAINT "CycleRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
