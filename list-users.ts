import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listUsers() {
  const users = await prisma.user.findMany({
    include: { profile: true }
  });
  console.log(JSON.stringify(users.map(u => ({
    phone: u.phone,
    mentorStatus: u.profile?.mentorStatus,
    certifiedTopics: u.profile?.certifiedTopicIds
  })), null, 2));
}

listUsers()
  .finally(() => prisma.$disconnect());
