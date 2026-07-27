-- CreateTable
CREATE TABLE "ExpertCalendarSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "reschedulePolicy" TEXT NOT NULL DEFAULT '24 hours prior',
    "bookingPeriodMonths" INTEGER NOT NULL DEFAULT 2,
    "defaultAvailability" JSONB NOT NULL DEFAULT '{}',
    "blockDates" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpertCalendarSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpertCalendarSettings_userId_key" ON "ExpertCalendarSettings"("userId");

-- AddForeignKey
ALTER TABLE "ExpertCalendarSettings" ADD CONSTRAINT "ExpertCalendarSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
