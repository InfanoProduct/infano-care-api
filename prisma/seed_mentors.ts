import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding specific mentors for PeerLine...');

  const mentors = [
    {
      phone: '+918888888888',
      displayName: 'Aanya Sharma',
      bio: 'Certified menstrual health specialist with 3 years of experience helping girls feel confident.',
      topics: ['period', 'body'],
      isOnline: true,
      experience: 52,
    },
    {
      phone: '+917777777777',
      displayName: 'Zoya Khan',
      bio: 'Passionate about mental wellness and academic stress. Let\'s navigate your journey together.',
      topics: ['mood', 'school', 'anxiety'],
      isOnline: false,
      unavailableUntil: new Date(Date.now() + 90 * 60000), // Back in 1.5 hours
      experience: 24,
    }
  ];

  for (const m of mentors) {
    await prisma.user.upsert({
      where: { phone: m.phone },
      update: {
        isTestNumber: true,
        accountStatus: 'ACTIVE',
        onboardingStep: 13,
        role: 'TEEN',
        profile: {
          upsert: {
            create: {
              displayName: m.displayName,
              bio: m.bio,
              mentorStatus: 'certified',
              certifiedTopicIds: m.topics,
              isAvailable: m.isOnline,
              unavailableUntil: m.unavailableUntil || null,
              completedSessionsCount: m.experience,
            },
            update: {
              displayName: m.displayName,
              bio: m.bio,
              mentorStatus: 'certified',
              certifiedTopicIds: m.topics,
              isAvailable: m.isOnline,
              unavailableUntil: m.unavailableUntil || null,
              completedSessionsCount: m.experience,
            }
          }
        }
      },
      create: {
        phone: m.phone,
        isTestNumber: true,
        accountStatus: 'ACTIVE',
        onboardingStep: 13,
        role: 'TEEN',
        profile: {
          create: {
            displayName: m.displayName,
            bio: m.bio,
            mentorStatus: 'certified',
            certifiedTopicIds: m.topics,
            isAvailable: m.isOnline,
            unavailableUntil: m.unavailableUntil || null,
            completedSessionsCount: m.experience,
          }
        }
      }
    });
    console.log(`Upserted mentor: ${m.displayName} (${m.phone})`);
  }

  console.log('Seed finished!');
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
