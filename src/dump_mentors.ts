import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function dumpMentors() {
  try {
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

    console.log(`Found ${mentors.length} certified mentors:\n`);
    console.log(JSON.stringify(mentors, null, 2));
  } catch (error) {
    console.error('Error fetching mentors:', error);
  } finally {
    await prisma.$disconnect();
  }
}

dumpMentors();
