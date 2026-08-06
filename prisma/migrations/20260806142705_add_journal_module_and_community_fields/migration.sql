-- CreateEnum
CREATE TYPE "JournalMode" AS ENUM ('free_write', 'guided_prompt', 'doodle', 'voice_note', 'mood_color', 'photo_board', 'letter_mode', 'video_diary', 'blackout_poetry', 'comic_strip', 'sticker_decorate', 'list_journal');

-- CreateEnum
CREATE TYPE "JournalVisibility" AS ENUM ('private', 'shared_to_connect');

-- AlterTable
ALTER TABLE "CommunityPost" ADD COLUMN "journalData" JSONB,
ADD COLUMN "journalEntryId" TEXT;

-- CreateTable
CREATE TABLE "QuestWeeklyChallenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetTotal" INTEGER NOT NULL,
    "rewardPoints" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'wellbeing',
    "completionCondition" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestWeeklyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWeeklyChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weeklyChallengeId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UserWeeklyChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mode" "JournalMode" NOT NULL,
    "promptId" TEXT,
    "moodTag" TEXT,
    "moodColor" TEXT,
    "content" JSONB NOT NULL,
    "isSealedTimeCapsule" BOOLEAN NOT NULL DEFAULT false,
    "capsuleRevealDate" TIMESTAMP(3),
    "visibility" "JournalVisibility" NOT NULL DEFAULT 'private',
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "linkedLearningEpisodeId" TEXT,
    "title" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalPrompt" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "bestModes" "JournalMode"[],
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastEntryDate" TIMESTAMP(3),
    "totalEntries" INTEGER NOT NULL DEFAULT 0,
    "modesUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "JournalStreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserWeeklyChallenge_userId_idx" ON "UserWeeklyChallenge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWeeklyChallenge_userId_weeklyChallengeId_key" ON "UserWeeklyChallenge"("userId", "weeklyChallengeId");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_createdAt_idx" ON "JournalEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_mode_idx" ON "JournalEntry"("userId", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "JournalStreak_userId_key" ON "JournalStreak"("userId");

-- AddForeignKey
ALTER TABLE "UserWeeklyChallenge" ADD CONSTRAINT "UserWeeklyChallenge_weeklyChallengeId_fkey" FOREIGN KEY ("weeklyChallengeId") REFERENCES "QuestWeeklyChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWeeklyChallenge" ADD CONSTRAINT "UserWeeklyChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "JournalPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalStreak" ADD CONSTRAINT "JournalStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
