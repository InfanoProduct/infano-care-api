import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mentors = await prisma.profile.findMany({
    where: { mentorStatus: 'certified' },
    include: { user: true }
  });

  console.log('Certified Mentors:', JSON.stringify(mentors, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
