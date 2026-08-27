import { PeerLineService } from '../src/modules/peerline/peerline.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const service = new PeerLineService();

async function test() {
  const user = await prisma.user.findFirst({ where: { role: 'TEEN' } });
  if (!user) {
    console.log('No teen user found');
    return;
  }
  const mentors = await service.getMentorsByTopics(user.id, []);
  console.log('Mentors returned from DB:', JSON.stringify(mentors, null, 2));
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
