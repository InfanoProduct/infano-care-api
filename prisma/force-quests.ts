import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const templates = await prisma.questTemplate.findMany({ where: { type: 'daily', isActive: true } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`Found ${users.length} users and ${templates.length} templates.`);

  for (const user of users) {
    console.log(`Generating quests for user: ${user.email} (${user.id})`);
    
    // Use the service logic manually to ensure they exist
    for (const template of templates) {
      await prisma.userDailyQuest.upsert({
        where: {
          userId_questTemplateId_questDate: {
            userId: user.id,
            questTemplateId: template.id,
            questDate: today
          }
        },
        update: {},
        create: {
          userId: user.id,
          questTemplateId: template.id,
          questDate: today,
          status: 'available'
        }
      });
    }
  }
  console.log('Quests forced for all users!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
