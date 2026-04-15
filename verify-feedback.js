import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyFeedback() {
  console.log('--- PeerLine Feedback Verification ---');

  // 1. Create a dummy session
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found to test with.');
    return;
  }

  const mentor = await prisma.user.findFirst({
    where: { profile: { mentorStatus: 'certified' } }
  });
  if (!mentor) {
    console.error('No mentor found to test with.');
    return;
  }

  console.log(`Using user: ${user.id} as mentee and user: ${mentor.id} as mentor`);

  const session = await prisma.peerLineSession.create({
    data: {
      menteeId: user.id,
      mentorId: mentor.id,
      topicIds: ['mood'],
      status: 'ACTIVE'
    }
  });

  console.log(`Created session: ${session.id}`);

  // 2. Submit Mentee Feedback
  console.log('Submitting mentee feedback...');
  await prisma.peerLineSession.update({
    where: { id: session.id },
    data: {
      menteeRating: 5,
      menteeNote: 'Great session!'
    }
  });

  // 3. Submit Mentor Feedback with Cooldown
  console.log('Submitting mentor feedback with cooldown...');
  const cooldownUntil = new Date();
  cooldownUntil.setHours(cooldownUntil.getHours() + 2);

  await prisma.peerLineSession.update({
    where: { id: session.id },
    data: {
      mentorRating: 4,
      mentorSelfRating: 5,
      mentorWellbeingOk: true,
      mentorNeedsSupport: true, // Should trigger flag
      mentorReadyForNext: false, // Should trigger cooldown
      mentorNote: 'Moderation note'
    }
  });

  await prisma.profile.update({
    where: { userId: mentor.id },
    data: { 
      unavailableUntil: cooldownUntil,
      pendingSafetyCheckin: true
    }
  });

  // 4. Verify results
  const updatedSession = await prisma.peerLineSession.findUnique({
    where: { id: session.id }
  });
  const updatedProfile = await prisma.profile.findUnique({
    where: { userId: mentor.id }
  });

  console.log('\nVerification Results:');
  console.log('Session Mentee Rating:', updatedSession?.menteeRating);
  console.log('Session Mentor Needs Support:', updatedSession?.mentorNeedsSupport);
  console.log('Profile Unavailable Until:', updatedProfile?.unavailableUntil);
  console.log('Profile Pending Safety Checkin:', updatedProfile?.pendingSafetyCheckin);

  // Cleanup
  await prisma.peerLineSession.delete({ where: { id: session.id } });
  console.log('\nCleanup complete.');
}

verifyFeedback()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
