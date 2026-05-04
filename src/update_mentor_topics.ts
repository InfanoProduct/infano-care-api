import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateMentorTopics() {
  console.log('Updating mentor topics to match new IDs...');
  
  const allMentors = await prisma.profile.findMany({
    where: { mentorStatus: 'certified' }
  });

  const availableTopics = ['period', 'mood', 'anxiety', 'body', 'relations', 'family', 'school'];

  for (const mentor of allMentors) {
    // Assign 2-3 random topics to each mentor
    const shuffled = availableTopics.sort(() => 0.5 - Math.random());
    const selectedTopics = shuffled.slice(0, Math.floor(Math.random() * 2) + 2);

    await prisma.profile.update({
      where: { id: mentor.id },
      data: {
        certifiedTopicIds: selectedTopics,
        isAvailable: true // Ensure they are available
      }
    });
    console.log(`Updated ${mentor.displayName} with topics: ${selectedTopics}`);
  }

  console.log('\nUpdate complete!');
}

updateMentorTopics().catch(console.error).finally(() => prisma.$disconnect());
