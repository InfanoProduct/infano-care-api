import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getAllMentorsData() {
  try {
    const mentors = await prisma.profile.findMany({
      where: {
        mentorStatus: 'certified'
      },
      include: {
        user: true
      }
    });

    console.log(`\n--- All Certified Mentors Data ---`);
    if (mentors.length === 0) {
      console.log("No certified mentors found.");
    } else {
      mentors.forEach((m, i) => {
        console.log(`\n[Mentor #${i + 1}]`);
        console.log(JSON.stringify(m, null, 2));
      });
    }
    console.log(`\n----------------------------------\n`);

  } catch (e) {
    console.error("❌ Error fetching mentors data:", e);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

getAllMentorsData();
