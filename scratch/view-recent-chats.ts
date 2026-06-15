import { prisma } from '../src/db/client.js';

async function main() {
  console.log('--- Recent Chat Messages ---');
  const sessions = await prisma.chatSession.findMany({
    orderBy: { lastMsgAt: 'desc' },
    take: 3,
    include: {
      user: { select: { username: true, role: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 10
      }
    }
  });

  for (const s of sessions) {
    console.log(`Session ID: ${s.id} | User: ${s.user?.username} (${s.user?.role})`);
    for (const m of s.messages) {
      console.log(`  [${m.sender}]: ${m.content}`);
    }
    console.log('==================================================');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
