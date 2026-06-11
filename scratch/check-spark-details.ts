import { prisma } from '../src/db/client.js';

async function main() {
  console.log('--- SPARK Program Details ---');
  const spark = await prisma.program.findFirst({
    where: { title: { equals: 'spark', mode: 'insensitive' } }
  });
  if (spark) {
    console.log(JSON.stringify(spark, null, 2));
  } else {
    console.log('SPARK program not found.');
  }

  console.log('\n--- All Program Enrollments in DB ---');
  const enrollments = await prisma.programEnrollment.findMany({
    include: {
      program: { select: { title: true } },
      user: { select: { id: true, username: true, role: true, phone: true } }
    }
  });
  console.log(`Found ${enrollments.length} enrollments:`);
  for (const e of enrollments) {
    console.log(`Enrollment ID: ${e.id}`);
    console.log(`  User: ${e.user.username} (${e.user.role}, Phone: ${e.user.phone})`);
    console.log(`  Program: ${e.program.title}`);
    console.log(`  Type: ${e.type}, Status: ${e.status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
