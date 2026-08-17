import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const userId = "50925891-b581-4342-9ec1-8029a5813196";
  const courseId = "048f5793-6a3c-4382-b8e3-1445595b6c68";
  const chapterId = "40bda408-9879-41e5-8df7-cdd3017aff24"; // Module 1 Assessment
  const score = 0;
  const answers = [0, 0, 0, 0, 0];

  console.log("Simulating markChapterComplete controller logic...");
  
  const enrollment = await prisma.lmsEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } }
  });

  if (!enrollment) {
    console.error("Enrollment not found");
    return;
  }
  console.log("Enrollment found:", enrollment.id);

  try {
    const progress = await prisma.lmsProgress.upsert({
      where: { enrollmentId_chapterId: { enrollmentId: enrollment.id, chapterId } },
      create: {
        enrollmentId: enrollment.id,
        chapterId,
        isCompleted: true,
        score: score ? Number(score) : null,
        answers: answers || null,
        watchTime: null,
        completedAt: new Date()
      },
      update: {
        isCompleted: true,
        score: score !== undefined ? Number(score) : undefined,
        answers: answers !== undefined ? answers : undefined,
        watchTime: undefined,
        completedAt: new Date()
      }
    });
    console.log("Success! Progress upserted:", progress);
  } catch (error) {
    console.error("Upsert failed:", error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
