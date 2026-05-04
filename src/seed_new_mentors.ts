import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedMentors() {
  console.log('Seeding 5 fresh certified mentors...');
  
  const mentors = [
    { name: 'Dr. Sarah J', bio: 'Expert in menstrual health and hormone balance.', topics: ['period', 'body'] },
    { name: 'Coach Maya', bio: 'Specialist in mood tracking and emotional wellness.', topics: ['mood', 'anxiety'] },
    { name: 'Dr. Emily Chen', bio: 'Family dynamics and relationship expert.', topics: ['relations', 'family'] },
    { name: 'Priya Sharma', bio: 'Academic stress and school-life balance coach.', topics: ['school', 'anxiety'] },
    { name: 'Jessica Bloom', bio: 'Body positivity and self-confidence mentor.', topics: ['body', 'mood'] },
  ];

  for (const m of mentors) {
    const user = await prisma.user.create({
      data: {
        phone: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        profile: {
          create: {
            displayName: m.name,
            bio: m.bio,
            mentorStatus: 'certified',
            certifiedTopicIds: m.topics,
            isAvailable: true,
            completedSessionsCount: Math.floor(20 + Math.random() * 50),
          }
        }
      }
    });
    console.log(`Created mentor: ${m.name}`);
  }

  console.log('\nSeed complete!');
}

seedMentors().catch(console.error).finally(() => prisma.$disconnect());
