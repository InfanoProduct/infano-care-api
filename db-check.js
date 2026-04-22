import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const posts = await prisma.communityPost.findMany({
      select: { id: true, challengeId: true, isChallengeResponse: true, content: true }
    });
    console.log('--- ALL Posts ---');
    console.log(JSON.stringify(posts, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

check();
