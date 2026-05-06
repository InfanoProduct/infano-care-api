import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const username = '23khushijaiswal2003@gmail.com';
  
  const user = await prisma.user.findUnique({
    where: { username },
    include: { profile: true }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('Fixing user:', user.username);

  // 1. Set peerOnboarding to true
  await prisma.user.update({
    where: { id: user.id },
    data: { peerOnboarding: true }
  });

  // 2. Create a PeerApplication if not exists
  await prisma.peerApplication.upsert({
    where: { userId: user.id },
    update: {
      status: 'pending'
    },
    create: {
      userId: user.id,
      name: user.profile?.displayName || 'Khushi Jaiswal',
      email: user.username || 'khushi@example.com',
      phone: user.phone || '+910000000000',
      personalStatement: 'I have a passion for helping others and want to share my lived experience to support the PeerLine community.',
      scenarioResponses: [
        'I would listen with empathy and let them know they are not alone.',
        'I would validate their stress and help them explore their feelings about the exams.'
      ],
      eligibility: {
        isOver18: true,
        hasLivedExperience: true,
        isFluent: true,
        isStable: true,
        isDigitallyLiterate: true,
        canCommit: true,
        agreesToVerification: true
      },
      status: 'pending'
    }
  });

  console.log('User fixed successfully. PeerApplication created.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
