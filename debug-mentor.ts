import { PrismaClient } from '@prisma/client';
import { PeerLineService } from './src/modules/peerline/peerline.service.js';

const prisma = new PrismaClient();
const peerLineService = new PeerLineService();

async function debugStats() {
  const user = await prisma.user.findFirst({
    where: { phone: '+911112223333' }
  });

  if (!user) {
    console.error('User 1112223333 not found');
    return;
  }

  console.log('Checking Stats for User:', user.id);
  
  try {
    const stats = await peerLineService.getMentorStats(user.id);
    console.log('Stats Response:', JSON.stringify(stats, null, 2));
    
    const status = await peerLineService.getMentorStatus(user.id);
    console.log('Status Response:', JSON.stringify(status, null, 2));
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
}

debugStats()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
