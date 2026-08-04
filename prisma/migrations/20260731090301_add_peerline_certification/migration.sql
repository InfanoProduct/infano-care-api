-- CreateTable
CREATE TABLE "PeerLineCertificationCourse" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PeerLineCertificationCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerLineCertificationEpisode" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "slug" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "thumbnailUrl" TEXT,

    CONSTRAINT "PeerLineCertificationEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PeerLineCertificationCourse_slug_key" ON "PeerLineCertificationCourse"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PeerLineCertificationEpisode_slug_key" ON "PeerLineCertificationEpisode"("slug");

-- AddForeignKey
ALTER TABLE "PeerLineCertificationEpisode" ADD CONSTRAINT "PeerLineCertificationEpisode_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "PeerLineCertificationCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
