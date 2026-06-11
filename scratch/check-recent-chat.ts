import { prisma } from '../src/db/client.js';

async function main() {
  console.log('--- Recent Chat Sessions ---');
  const sessions = await prisma.chatSession.findMany({
    orderBy: { lastMsgAt: 'desc' },
    take: 3,
    include: {
      user: { select: { id: true, username: true, role: true, phone: true } },
      messages: { orderBy: { createdAt: 'asc' } }
    }
  });

  for (const s of sessions) {
    console.log(`\nSession ID: ${s.id} (User: ${s.user.username}, Role: ${s.user.role}, Phone: ${s.user.phone})`);
    console.log(`Last Active: ${s.lastMsgAt}`);
    console.log(`Messages (${s.messages.length}):`);
    s.messages.forEach(m => {
      console.log(`  [${m.sender}] (${m.createdAt}): ${m.content}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
