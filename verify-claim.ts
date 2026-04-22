import { PrismaClient, PeerLineStatus } from '@prisma/client';
import { PeerLineService } from './src/modules/peerline/peerline.service.js';

const prisma = new PrismaClient();
const peerLineService = new PeerLineService();

async function testClaim() {
  console.log('--- PeerLine Claim Logic Verification ---');

  // 1. Find a certified mentor
  const mentor = await prisma.user.findFirst({
    where: { profile: { mentorStatus: 'certified' } },
    include: { profile: true }
  });

  if (!mentor) {
    console.error('No certified mentor found in DB.');
    return;
  }

  console.log(`Using Mentor: ${mentor.id}`);

  // 2. Find a non-mentor user to act as mentee
  const mentee = await prisma.user.findFirst({
    where: { 
      profile: { 
        mentorStatus: 'none' 
      } 
    }
  });

  if (!mentee) {
    console.warn('No non-mentor user found. Using first user as mentee.');
  }
  const menteeUser = mentee || (await prisma.user.findFirst());
  const menteeId = menteeUser.id;
  console.log(`Using Mentee: ${menteeId}`);

  // 3. Ensure mentor is available and has some certified topics
  await prisma.profile.update({
    where: { userId: mentor.id },
    data: { 
      isAvailable: true,
      certifiedTopicIds: ['stress', 'anxiety']
    }
  });

  // 4. Create a queued session with matching topics
  console.log('Creating matching queued session...');
  const session = await prisma.peerLineSession.create({
    data: {
      menteeId: menteeId,
      status: PeerLineStatus.QUEUED,
      topicIds: ['stress'],
    }
  });
  console.log(`Created Session: ${session.id}`);

  // 5. Test claimNextSession
  console.log('Testing claimNextSession...');
  try {
    const claimed = await peerLineService.claimNextSession(mentor.id);
    console.log('Claim Success!');
    console.log(`Claimed Session ID: ${claimed.id}`);
    console.log(`Status: ${claimed.status} (Expected: ACTIVE)`);
    console.log(`Mentor ID: ${claimed.mentorId} (Expected: ${mentor.id})`);
    
    if (claimed.status === PeerLineStatus.ACTIVE && claimed.mentorId === mentor.id) {
       console.log('\n--- VERIFICATION PASSED ---');
    } else {
       console.error('\n--- VERIFICATION FAILED: Status or Mentor mismatch ---');
    }
  } catch (error: any) {
    console.error('Claim Failed:', error.message);
  }

  // Cleanup
  await prisma.peerLineSession.delete({ where: { id: session.id } });
}

testClaim()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
