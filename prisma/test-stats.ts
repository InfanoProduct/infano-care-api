import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const totalMembers = await prisma.user.count({ where: { role: "TEEN" } });
    console.log('Total Members:', totalMembers);

    const activeConsultations = await prisma.expertChatSession.count({ where: { status: "active" } });
    console.log('Active Consultations:', activeConsultations);

    const totalJourneys = await prisma.learningJourney.count();
    console.log('Total Journeys:', totalJourneys);

    const totalEpisodes = await prisma.episode.count();
    console.log('Total Episodes:', totalEpisodes);

    console.log('Stats fetch successful!');
  } catch (error) {
    console.error('Stats fetch failed:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
