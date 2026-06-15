import { prisma } from '../src/db/client.js';

async function main() {
  const user = await prisma.user.findFirst({
    where: { username: 'b.karunakar2426@gmail.com' }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log(`--- Chat Sessions for User ${user.username} (${user.id}) ---`);
  const sessions = await prisma.chatSession.findMany({
    where: { userId: user.id },
    orderBy: { lastMsgAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  for (const s of sessions) {
    console.log(`Session ID: ${s.id}`);
    for (const m of s.messages) {
      console.log(`  [${m.sender}]: ${m.content}`);
    }
    console.log('==================================================');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
