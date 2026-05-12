import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const userQuests = await prisma.userDailyQuest.findMany({
    where: { questDate: today },
    include: { questTemplate: true }
  });
  console.log('USER QUESTS FOR TODAY:', JSON.stringify(userQuests, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
