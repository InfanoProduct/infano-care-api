import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkProfile() {
  const profile = await prisma.profile.findUnique({
    where: { userId: '1112223333' }
  });
  console.log(JSON.stringify(profile, null, 2));
}

checkProfile().finally(() => prisma.$disconnect());
