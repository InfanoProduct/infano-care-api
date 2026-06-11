import { prisma } from '../src/db/client.js';

async function main() {
  console.log('--- Program Enrollments in DB ---');
  const enrollments = await prisma.programEnrollment.findMany({
    include: {
      user: { select: { username: true, role: true } },
      program: { select: { title: true } }
    }
  });
  console.log(enrollments);
}

main().catch(console.error).finally(() => prisma.$disconnect());
