import { prisma } from '../src/db/client.js';
import { PeerLineService } from '../src/modules/peerline/peerline.service.js';

async function acceptLatestSession() {
  const service = new PeerLineService();
  
  console.log('Finding the latest MATCHING session...');
  
  const latestSession = await prisma.peerLineSession.findFirst({
    where: {
      status: 'MATCHING',
      mentorId: { not: null }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!latestSession || !latestSession.mentorId) {
    console.log('No MATCHING session found with an assigned mentor.');
    return;
  }

  console.log(`Found session ${latestSession.id} waiting for mentor ${latestSession.mentorId}.`);
  console.log('Accepting session...');

  try {
    const acceptedSession = await service.acceptSession(latestSession.mentorId, latestSession.id);
    console.log(`Success! Session ${acceptedSession.id} is now ${acceptedSession.status}.`);
  } catch (e) {
    console.error('Failed to accept session:', e);
  }
}

acceptLatestSession()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
