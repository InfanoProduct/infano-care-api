import { CommunityService } from '../src/modules/community/community.service.js';
import { prisma } from '../src/db/client.js';

async function test() {
  const service = new CommunityService();
  try {
    console.log('Testing getCircles...');
    const result = await service.getCircles(null, null);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error in getCircles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
