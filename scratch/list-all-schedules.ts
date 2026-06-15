import { prisma } from '../src/db/client.js';

async function main() {
  console.log('Fetching all ExpertSessionSchedule records in DB...');
  const schedules = await prisma.expertSessionSchedule.findMany({
    include: {
      user: { select: { username: true, role: true } },
      program: { select: { title: true } }
    }
  });

  console.log(`Found ${schedules.length} schedules:`);
  for (const s of schedules) {
    console.log(`ID: ${s.id}`);
    console.log(`  User: ${s.user?.username} (Role: ${s.user?.role})`);
    console.log(`  Program: ${s.program?.title}`);
    console.log(`  SessionNumber: ${s.sessionNumber}`);
    console.log(`  ScheduledAt: ${s.scheduledAt} (Raw: ${s.scheduledAt.toISOString()})`);
    console.log(`  Status: ${s.status}`);
    console.log('--------------------------------------------------');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
