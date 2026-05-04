import { prisma } from './src/db/client.js';

async function checkDb() {
  try {
    const circleCount = await prisma.communityCircle.count();
    const postCount = await prisma.communityPost.count();
    const userCount = await prisma.user.count();
    
    console.log('--- DB Status ---');
    console.log('Circles:', circleCount);
    console.log('Posts:', postCount);
    console.log('Users:', userCount);
    
    if (circleCount > 0) {
      const circles = await prisma.communityCircle.findMany();
      console.log('Circles List:', JSON.stringify(circles, null, 2));
    }
  } catch (error) {
    console.error('Error checking DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
