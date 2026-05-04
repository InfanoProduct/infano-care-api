import { prisma } from './src/db/client.js';

async function run() {
  // Find all duplicate MATCHING sessions to the same mentor per mentee
  const sessions = await prisma.peerLineSession.findMany({
    where: {
      status: { in: ['MATCHING', 'QUEUED'] },
      mentorId: { not: null }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Group by menteeId + mentorId
  const seen = new Map<string, string>();
  const toDelete: string[] = [];

  for (const s of sessions) {
    const key = `${s.menteeId}::${s.mentorId}`;
    if (seen.has(key)) {
      // duplicate — keep the newer (seen already has the older), delete older
      toDelete.push(seen.get(key)!);
      seen.set(key, s.id); // keep the newer
    } else {
      seen.set(key, s.id);
    }
  }

  if (toDelete.length === 0) {
    console.log('No duplicates found.');
  } else {
    await prisma.peerLineSession.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`Deleted ${toDelete.length} duplicate session(s):`, toDelete);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
