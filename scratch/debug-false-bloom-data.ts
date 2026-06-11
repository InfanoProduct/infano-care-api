import { prisma } from '../src/db/client.js';

async function main() {
  console.log('Searching for messages containing "BLOOM" or "2024-02-15"...');
  const messages = await prisma.chatMessage.findMany({
    where: {
      OR: [
        { content: { contains: '2024-02-15' } },
        { content: { contains: 'BLOOM' } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    include: {
      session: {
        include: {
          user: { select: { username: true, role: true } }
        }
      }
    }
  });

  console.log(`Found ${messages.length} matching messages:`);
  for (const m of messages) {
    console.log(`\nMessage ID: ${m.id}`);
    console.log(`Sender: ${m.sender}`);
    console.log(`Session ID: ${m.sessionId} (User: ${m.session.user?.username}, Role: ${m.session.user?.role})`);
    console.log(`Content:\n${m.content}`);
    console.log('--------------------------------------------------');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
