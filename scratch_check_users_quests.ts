import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true }
  });
  const quests = await prisma.userDailyQuest.findMany();

  const userStats = users.map(u => ({
    ...u,
    questCount: quests.filter(q => q.userId === u.id).length
  }));

  console.log('USER QUEST STATS:', JSON.stringify(userStats, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
