import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testMatching() {
  const testTopics = ['period', 'mood'];
  console.log(`Testing matching for topics: ${testTopics}\n`);

  try {
    const mentors = await prisma.user.findMany({
      where: {
        profile: {
          mentorStatus: 'certified',
          certifiedTopicIds: { hasSome: testTopics }
        }
      },
      include: {
        profile: true
      }
    });

    console.log(`Matches found: ${mentors.length}`);
    mentors.forEach(m => {
      console.log(`- ${m.profile?.displayName} (Topics: ${m.profile?.certifiedTopicIds})`);
    });

  } catch (error) {
    console.error('Error during matching test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMatching();
