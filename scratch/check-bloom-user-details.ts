import { prisma } from '../src/db/client.js';

async function main() {
  console.log('--- User b.karunakar2426@gmail.com details ---');
  const user = await prisma.user.findFirst({
    where: { username: 'b.karunakar2426@gmail.com' }
  });
  console.log(user);

  if (user) {
    console.log(`\n--- User Expert Session Schedules ---`);
    const schedules = await prisma.expertSessionSchedule.findMany({
      where: { userId: user.id }
    });
    console.log(schedules);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
