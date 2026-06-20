/*
  Warnings:

  - Renaming `sessionPrice` to `consultationPrice` on the `Profile` table to preserve data.

*/
-- AlterTable
ALTER TABLE "Profile" RENAME COLUMN "sessionPrice" TO "consultationPrice";
