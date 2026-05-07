import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching topics...');
  const topics = await prisma.peerLineTopic.findMany();
  if (topics.length === 0) {
    console.log('No topics found. Run check_and_seed_topics.ts first.');
    return;
  }

  const topicMap = topics.reduce((acc, t) => {
    acc[t.name] = t.id;
    return acc;
  }, {} as Record<string, string>);

  console.log('Seeding mentors with real topic IDs...');

  const mentors = [
    { 
      name: 'Dr. Sarah J', 
      bio: 'Expert in menstrual health and hormone balance.', 
      topics: [topicMap['Menstrual Health'], topicMap['Body Confidence']].filter(Boolean) as string[],
      expertise: {
        [topicMap['Menstrual Health'] as string]: ['PCOS', 'Endometriosis', 'Irregular Cycles'],
        [topicMap['Body Confidence'] as string]: ['Self Love', 'Body Image']
      }
    },
    { 
      name: 'Coach Maya', 
      bio: 'Specialist in mood tracking and emotional wellness.', 
      topics: [topicMap['Mental Wellbeing']].filter(Boolean) as string[],
      expertise: {
        [topicMap['Mental Wellbeing'] as string]: ['Anxiety', 'Depression', 'Stress Management']
      }
    },
    { 
      name: 'Dr. Emily Chen', 
      bio: 'Family dynamics and relationship expert.', 
      topics: [topicMap['Relationship Advice']].filter(Boolean) as string[],
      expertise: {
        [topicMap['Relationship Advice'] as string]: ['Break-up talks', 'Family Conflicts', 'Communication']
      }
    },
    { 
      name: 'Priya Sharma', 
      bio: 'Academic stress and school-life balance coach.', 
      topics: [topicMap['Mental Wellbeing'], topicMap['Friendship & Peers']].filter(Boolean) as string[],
      expertise: {
        [topicMap['Mental Wellbeing'] as string]: ['Exam Stress', 'Time Management'],
        [topicMap['Friendship & Peers'] as string]: ['Peer Pressure', 'Social Anxiety']
      }
    },
    { 
      name: 'Jessica Bloom', 
      bio: 'Body positivity and self-confidence mentor.', 
      topics: [topicMap['Body Confidence'], topicMap['Menstrual Health']].filter(Boolean) as string[],
      expertise: {
        [topicMap['Body Confidence'] as string]: ['Self Esteem', 'Public Speaking'],
        [topicMap['Menstrual Health'] as string]: ['Period Pain', 'Hygiene']
      }
    },
    {
      name: 'Anita Roy',
      bio: 'Specializing in sexual health and reproductive rights education.',
      topics: [topicMap['Sexual Education'], topicMap['Body Confidence']].filter(Boolean) as string[],
      expertise: {
        [topicMap['Sexual Education'] as string]: ['Safe Practices', 'Consent'],
        [topicMap['Body Confidence'] as string]: ['Identity', 'Coming Out']
      }
    }
  ];

  for (const m of mentors) {
    const existingProfile = await prisma.profile.findFirst({
      where: { displayName: m.name }
    });

    if (existingProfile) {
      console.log(`Updating existing mentor: ${m.name}`);
      await prisma.profile.update({
        where: { id: existingProfile.id },
        data: {
          certifiedTopicIds: m.topics,
          mentorExpertise: m.expertise,
          mentorStatus: 'certified',
          isAvailable: true
        }
      });
    } else {
      console.log(`Creating new mentor: ${m.name}`);
      await prisma.user.create({
        data: {
          phone: `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`,
          username: m.name.toLowerCase().replace(/\s/g, '_'),
          profile: {
            create: {
              displayName: m.name,
              bio: m.bio,
              mentorStatus: 'certified',
              certifiedTopicIds: m.topics,
              mentorExpertise: m.expertise,
              isAvailable: true,
              completedSessionsCount: Math.floor(10 + Math.random() * 40),
            }
          }
        }
      });
    }
  }


  console.log('Mentor seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
