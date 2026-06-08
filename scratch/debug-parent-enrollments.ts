import { prisma } from "../src/db/client.js";

async function main() {
  const userId = "36a04b31-60ff-4e99-96e9-00a177e112b5"; // parent id

  const userEnrollments = await prisma.programEnrollment.findMany({
    where: { userId, status: "ACTIVE" },
    include: { program: true }
  });
  console.log("Found Enrollments count:", userEnrollments.length);

  const userProgramsProgress = [];
  for (const enrollment of userEnrollments) {
    const totalSessions = enrollment.program.sessions || 8;
    const completedSessions = await prisma.expertSessionSchedule.count({
      where: {
        userId,
        programId: enrollment.programId,
        status: "COMPLETED"
      }
    });
    const percentComplete = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    const nextProgSession = await prisma.expertSessionSchedule.findFirst({
      where: {
        userId,
        programId: enrollment.programId,
        scheduledAt: { gte: new Date() },
        status: "SCHEDULED"
      },
      orderBy: { scheduledAt: "asc" }
    });
    userProgramsProgress.push({
      programTitle: enrollment.program.title,
      completedSessions,
      totalSessions,
      percentComplete,
      nextSessionAt: nextProgSession ? nextProgSession.scheduledAt : null
    });
  }

  console.log("userProgramsProgress:", JSON.stringify(userProgramsProgress, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
