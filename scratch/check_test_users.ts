import { prisma } from '../src/db/client.js';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      phone: true,
      isTestNumber: true,
      accountStatus: true,
      onboardingCompletedAt: true,
      role: true,
      profile: {
        select: { displayName: true }
      }
    }
  });
  console.log('ALL USERS:', JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
