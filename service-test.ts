import { CommunityService } from './src/modules/community/community.service.js';
import { prisma } from './src/db/client.js';

async function test() {
  const service = new CommunityService();
  try {
    console.log('Testing getCircles(null)...');
    const result1 = await service.getCircles(null);
    console.log('Result 1 success. Circles count:', result1.length);

    console.log('Testing getCircles("fake-user-id")...');
    // Note: This might fail if the user ID doesn't exist in the DB depending on constraints
    const result2 = await service.getCircles('00000000-0000-0000-0000-000000000000'); 
    console.log('Result 2 success. Circles count:', result2.length);

  } catch (error) {
    console.error('Service test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
