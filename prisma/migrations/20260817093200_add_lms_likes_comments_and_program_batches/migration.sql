-- AlterTable
ALTER TABLE "ExpertSessionSchedule" ADD COLUMN     "batchId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TrackerArticle" ALTER COLUMN "emoji" SET DEFAULT '📖';

-- AlterTable
ALTER TABLE "ProgramEnrollment" ADD COLUMN     "batchId" TEXT;

-- CreateTable
CREATE TABLE "ProgramBatch" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "maxCapacity" INTEGER NOT NULL DEFAULT 20,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "expertId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsChapterLike" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LmsChapterLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LmsComment" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorInitials" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "likedUsers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LmsComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgramBatch_programId_idx" ON "ProgramBatch"("programId");

-- CreateIndex
CREATE INDEX "LmsChapterLike_chapterId_idx" ON "LmsChapterLike"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "LmsChapterLike_chapterId_userId_key" ON "LmsChapterLike"("chapterId", "userId");

-- CreateIndex
CREATE INDEX "LmsComment_chapterId_idx" ON "LmsComment"("chapterId");

-- CreateIndex
CREATE INDEX "ExpertSessionSchedule_batchId_idx" ON "ExpertSessionSchedule"("batchId");

-- CreateIndex
CREATE INDEX "ProgramEnrollment_batchId_idx" ON "ProgramEnrollment"("batchId");

-- AddForeignKey
ALTER TABLE "ExpertSessionSchedule" ADD CONSTRAINT "ExpertSessionSchedule_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProgramBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBatch" ADD CONSTRAINT "ProgramBatch_expertId_fkey" FOREIGN KEY ("expertId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramBatch" ADD CONSTRAINT "ProgramBatch_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProgramBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsChapterLike" ADD CONSTRAINT "LmsChapterLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsComment" ADD CONSTRAINT "LmsComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
