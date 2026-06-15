import { prisma } from '../src/db/client.js';

async function main() {
  const parent = await prisma.user.findFirst({
    where: { username: '23khushijaiswal2003@gmail.com' }
  });
  console.log('Parent user:', parent);

  if (parent) {
    const links = await prisma.parentLink.findMany({
      where: {
        OR: [
          { parentId: parent.id },
          { teenId: parent.id }
        ]
      },
      include: {
        teen: true,
        parent: true
      }
    });
    console.log('\nParent links:', links);

    for (const link of links) {
      if (link.teenId) {
        console.log(`\n--- Teen ${link.teen?.username} Expert Session Schedules ---`);
        const schedules = await prisma.expertSessionSchedule.findMany({
          where: { userId: link.teenId }
        });
        console.log(schedules);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
