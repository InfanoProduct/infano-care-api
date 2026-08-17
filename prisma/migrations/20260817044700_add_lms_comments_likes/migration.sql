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

-- CreateTable
CREATE TABLE "LmsChapterLike" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LmsChapterLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LmsComment_chapterId_idx" ON "LmsComment"("chapterId");

-- CreateIndex
CREATE INDEX "LmsChapterLike_chapterId_idx" ON "LmsChapterLike"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "LmsChapterLike_chapterId_userId_key" ON "LmsChapterLike"("chapterId", "userId");

-- AddForeignKey
ALTER TABLE "LmsComment" ADD CONSTRAINT "LmsComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LmsChapterLike" ADD CONSTRAINT "LmsChapterLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
