-- AlterTable: Add totalCoins column to CreativeEpisode
ALTER TABLE "CreativeEpisode" ADD COLUMN IF NOT EXISTS "totalCoins" INTEGER NOT NULL DEFAULT 83;

-- AlterTable: Add totalCoins column to Profile
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "totalCoins" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Add coinsTotal column to UserLevel
ALTER TABLE "UserLevel" ADD COLUMN IF NOT EXISTS "coinsTotal" INTEGER NOT NULL DEFAULT 0;
