import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkState() {
  console.log('--- PeerLine Database Check ---');

  const mentors = await prisma.profile.findMany({
    where: { mentorStatus: 'certified' },
    include: { user: { select: { birthYear: true, phone: true } } }
  });

  console.log(`Found ${mentors.length} certified mentors:`);
  mentors.forEach(m => {
    console.log(`- ${m.displayName} (${m.user.phone}): topics=${m.certifiedTopicIds}, isAvailable=${m.isAvailable}, birthYear=${m.user.birthYear}`);
  });

  const sessions = await prisma.peerLineSession.findMany({
    where: { status: { in: ['QUEUED', 'MATCHING'] } },
    include: { mentee: { select: { birthYear: true, phone: true, profile: { select: { displayName: true } } } } }
  });

  console.log(`\nFound ${sessions.length} sessions in queue:`);
  sessions.forEach(s => {
    console.log(`- Session ${s.id}: mentee=${s.mentee.profile?.displayName}, topics=${s.topicIds}, menteeBirthYear=${s.mentee.birthYear}, requestedVerified=${s.requestedVerified}`);
  });

  if (mentors.length > 0 && sessions.length > 0) {
    console.log('\nPotential matches:');
    for (const m of mentors) {
      console.log(`\nMentor: ${m.displayName}`);
      for (const s of sessions) {
        const topicMatch = s.topicIds.some(tid => m.certifiedTopicIds.includes(tid));
        const ageMatch = !m.user.birthYear || !s.mentee.birthYear || Math.abs(m.user.birthYear - s.mentee.birthYear) <= 4;
        const verifiedMatch = !s.requestedVerified || (m.mentorStatus === 'certified'); // simplified check

        if (topicMatch && ageMatch && verifiedMatch) {
          console.log(`✅ COULD match Session ${s.id} (Mentee: ${s.mentee.profile?.displayName})`);
        } else {
          console.log(`❌ Match fails for Session ${s.id}: topicMatch=${topicMatch}, ageMatch=${ageMatch}, verifiedMatch=${verifiedMatch}`);
        }
      }
    }
  }

  await prisma.$disconnect();
}

checkState().catch(err => {
  console.error(err);
  process.exit(1);
});
