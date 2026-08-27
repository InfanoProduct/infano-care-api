import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Enriching existing peer mentor profiles in database...');

  // 1. Enrich Khushi (+916306890199)
  const khushiUser = await prisma.user.findFirst({
    where: { phone: '+916306890199' },
    include: { profile: true }
  });

  if (khushiUser) {
    await prisma.profile.update({
      where: { userId: khushiUser.id },
      data: {
        displayName: 'Khushi Sharma',
        mentorStatus: 'certified',
        isAvailable: true,
        bio: 'Hi there! I am Khushi, a certified peer mentor passionate about creating a safe, judgment-free space for young girls. Whether you are navigating school stress, emotional highs & lows, or just need a warm listening ear, I am here to help you feel supported and heard.',
        certifiedTopicIds: ['topic-mental-health', 'topic-personal-growth', 'topic-self-esteem'],
        mentorExpertise: {
          'topic-mental-health': ['Emotional Wellness', 'Active Listening', 'Stress Relief'],
          'topic-personal-growth': ['Self-Discovery', 'Mindfulness'],
          'topic-self-esteem': ['Body Confidence', 'Self-Love']
        },
        completedSessionsCount: 48
      }
    });
    console.log('Updated Khushi profile successfully.');
  }

  // 2. Enrich Akansha (+911234567894)
  const akanshaUser = await prisma.user.findFirst({
    where: { phone: '+911234567894' },
    include: { profile: true }
  });

  if (akanshaUser) {
    await prisma.profile.update({
      where: { userId: akanshaUser.id },
      data: {
        displayName: 'Akansha',
        mentorStatus: 'certified',
        isAvailable: true,
        bio: 'Hello! I am Akansha. School, exams, and peer pressure can feel overwhelming at times. I offer actionable coping strategies, study-life balance tips, and genuine peer encouragement so you never feel alone in your journey.',
        certifiedTopicIds: ['topic-academic-stress', 'topic-relationships', 'topic-mental-health'],
        mentorExpertise: {
          'topic-academic-stress': ['Exam Pressure', 'Time Management', 'Study Routines'],
          'topic-relationships': ['Friendships', 'Peer Dynamics'],
          'topic-mental-health': ['Calm & Focus']
        },
        completedSessionsCount: 36
      }
    });
    console.log('Updated Akansha profile successfully.');
  }

  console.log('Enrichment complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
