import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const quests = await prisma.userDailyQuest.findMany();
  console.log('USER QUESTS COUNT:', quests.length);
  if (quests.length > 0) {
    console.log('FIRST QUEST:', JSON.stringify(quests[0], null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
