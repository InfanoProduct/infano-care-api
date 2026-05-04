import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const mentors = await prisma.user.findMany({
    where: {
      profile: {
        mentorStatus: 'certified'
      }
    },
    include: {
      profile: true
    }
  });

  console.log(`Found ${mentors.length} certified mentors.`);
  mentors.forEach(m => {
    console.log(`- ${m.profile?.displayName} (${m.phone}): Topics: ${m.profile?.certifiedTopicIds}`);
  });
}

main().then(() => prisma.$disconnect());
