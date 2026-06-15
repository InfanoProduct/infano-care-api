import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, role: true, phone: true }
  });
  console.log("Users:", users);

  const links = await prisma.parentLink.findMany();
  console.log("Links:", links);

  const enrollments = await prisma.programEnrollment.findMany();
  console.log("Enrollments:", enrollments);
}

main().catch(console.error).finally(() => prisma.$disconnect());
