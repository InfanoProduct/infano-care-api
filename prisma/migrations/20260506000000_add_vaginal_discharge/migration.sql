-- AlterTable: add vaginalDischarge column to CycleLog if it doesn't exist
ALTER TABLE "CycleLog" ADD COLUMN IF NOT EXISTS "vaginalDischarge" TEXT;
