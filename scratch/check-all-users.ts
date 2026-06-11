import { prisma } from '../src/db/client.js';

async function main() {
  console.log('--- All Users and Roles in DB ---');
  const users = await prisma.user.findMany({
    include: {
      profile: { select: { displayName: true } },
      programEnrollments: {
        where: { status: 'ACTIVE' },
        include: { program: true }
      }
    }
  });

  for (const u of users) {
    console.log(`User ID: ${u.id}`);
    console.log(`  Username: ${u.username}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  Phone: ${u.phone}`);
    console.log(`  Name: ${u.profile?.displayName}`);
    console.log(`  Active Enrollments:`);
    for (const e of u.programEnrollments) {
      console.log(`    - Program: ${e.program.title} (sessions: ${e.program.sessions})`);
    }
    console.log('--------------------------------------------------');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
