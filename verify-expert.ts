import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const phone = '1112223333';
  const user = await prisma.user.findUnique({
    where: { phone },
    include: { profile: true }
  });

  console.log(JSON.stringify(user, null, 2));

  const availableCount = await prisma.user.count({
    where: {
      profile: {
        mentorStatus: 'certified',
        isAvailable: true,
      }
    }
  });
  console.log(`Available mentors count: ${availableCount}`);
}

main().finally(() => prisma.$disconnect());
