import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const phone = '1112223333';
  console.log(`[Seed] Setting up expert mentor: ${phone}`);

  const user = await prisma.user.upsert({
    where: { phone },
    update: {},
    create: {
      phone,
      accountStatus: 'ACTIVE',
      role: 'TEEN',
      contentTier: 'TEEN_LATE',
    },
  });

  const topics = ['period', 'mood', 'anxiety', 'body', 'relations', 'family', 'school', 'other'];

  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      mentorStatus: 'certified',
      certifiedTopicIds: topics,
      isAvailable: true,
      displayName: 'Expert Mentor',
    },
    create: {
      userId: user.id,
      displayName: 'Expert Mentor',
      mentorStatus: 'certified',
      certifiedTopicIds: topics,
      isAvailable: true,
    },
  });

  console.log(`[Seed] Expert mentor ${phone} is now certified for all topics and set to available.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
