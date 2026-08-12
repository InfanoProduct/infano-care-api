-- AlterTable
ALTER TABLE "TrustedContact" ADD COLUMN "emergencyTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "CreativeAskGigiEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "entryText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreativeAskGigiEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeEpisode" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "episodeIcon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "totalXP" INTEGER NOT NULL DEFAULT 145,
    "unlockCondition" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeJourney" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ageBand" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeNodeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOCKED',
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "lastScreen" TEXT,
    "nodeOrder" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeNodeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreativeAskGigiEntry_userId_episodeId_idx" ON "CreativeAskGigiEntry"("userId", "episodeId");

-- CreateIndex
CREATE INDEX "CreativeAskGigiEntry_userId_idx" ON "CreativeAskGigiEntry"("userId");

-- CreateIndex
CREATE INDEX "CreativeNodeProgress_userId_episodeId_idx" ON "CreativeNodeProgress"("userId", "episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeNodeProgress_userId_episodeId_nodeId_key" ON "CreativeNodeProgress"("userId", "episodeId", "nodeId");

-- AddForeignKey
ALTER TABLE "CreativeAskGigiEntry" ADD CONSTRAINT "CreativeAskGigiEntry_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "CreativeEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeAskGigiEntry" ADD CONSTRAINT "CreativeAskGigiEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeEpisode" ADD CONSTRAINT "CreativeEpisode_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "CreativeJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeNodeProgress" ADD CONSTRAINT "CreativeNodeProgress_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "CreativeEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeNodeProgress" ADD CONSTRAINT "CreativeNodeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
