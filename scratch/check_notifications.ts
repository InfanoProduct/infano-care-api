import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const enrollments = await prisma.programEnrollment.findMany({
    select: {
      id: true,
      userId: true,
      programId: true,
      status: true,
      user: {
        select: {
          username: true
        }
      },
      program: {
        select: {
          title: true
        }
      }
    }
  });

  console.log("=== ENROLLMENTS ===");
  console.log(JSON.stringify(enrollments, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
