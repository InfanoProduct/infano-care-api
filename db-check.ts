const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const challenges = await prisma.weeklyChallenge.findMany();
  console.log('--- Challenges ---');
  console.log(JSON.stringify(challenges, null, 2));

  const posts = await prisma.communityPost.findMany({
    where: { challengeId: { not: null } },
    select: { id: true, challengeId: true, status: true, authorId: true }
  });
  console.log('--- Challenge Posts ---');
  console.log(JSON.stringify(posts, null, 2));

  process.exit(0);
}

check();
