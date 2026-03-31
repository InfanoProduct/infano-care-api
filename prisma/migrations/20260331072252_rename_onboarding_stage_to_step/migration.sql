/*
  Warnings:

  - You are about to drop the column `onboardingStage` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "onboardingStage",
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0;
