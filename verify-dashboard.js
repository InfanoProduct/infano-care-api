import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDashboard() {
  console.log('--- Mentor Dashboard Verification ---');

  // 1. Find a mentor
  const mentor = await prisma.user.findFirst({
    where: { profile: { mentorStatus: 'certified' } },
    include: { profile: true }
  });
  if (!mentor) {
    console.error('No certified mentor found.');
    return;
  }

  console.log(`Using mentor: ${mentor.id} (${mentor.profile?.isAvailable ? 'Online' : 'Offline'})`);

  // 2. Mock Availability Toggle
  console.log('Toggling availability to ON...');
  await prisma.profile.update({
    where: { userId: mentor.id },
    data: { isAvailable: true }
  });

  // 3. Create some mock history
  console.log('Creating mock session history...');
  await prisma.peerLineSession.create({
    data: {
      mentorId: mentor.id,
      menteeId: 'some-mentee-id', // Placeholder
      topicIds: ['stress', 'wellbeing'],
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 3600000),
      endedAt: new Date(),
      menteeRating: 5
    }
  });

  // 4. Verify Stats
  console.log('Fetching stats...');
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sessionsTotal = await prisma.peerLineSession.count({
    where: { mentorId: mentor.id, status: 'COMPLETED' }
  });
  const sessionsThisWeek = await prisma.peerLineSession.count({
    where: { mentorId: mentor.id, status: 'COMPLETED', createdAt: { gte: weekAgo } }
  });
  const avgRating = await prisma.peerLineSession.aggregate({
    _avg: { menteeRating: true },
    where: { mentorId: mentor.id, status: 'COMPLETED' }
  });

  console.log('\nStats Result:');
  console.log('Total Sessions:', sessionsTotal);
  console.log('Sessions This Week:', sessionsThisWeek);
  console.log('Avg Rating:', avgRating._avg.menteeRating);

  // 5. Verify Queue Count
  const queueCount = await prisma.peerLineSession.count({
    where: { status: { in: ['QUEUED', 'MATCHING'] } }
  });
  console.log('Global Queue Count:', queueCount);

  console.log('\nVerification complete.');
}

verifyDashboard()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
