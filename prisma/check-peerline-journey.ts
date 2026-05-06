import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const journey = await prisma.learningJourney.findUnique({
    where: { slug: 'peerline-mentor-certification' },
    include: { episodes: true }
  });

  if (journey) {
    console.log('Journey found:', journey.title);
    console.log('Episodes count:', journey.episodes.length);
  } else {
    console.log('Journey "peerline-mentor-certification" NOT found.');
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
