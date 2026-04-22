
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const episode = await prisma.episode.findFirst({
    where: { title: "Welcome to the Club" }
  });

  if (episode) {
    console.log(`Episode: ${episode.title}`);
    console.log('Content:');
    console.log(JSON.stringify(episode.content, null, 2));
  } else {
    console.log('Episode not found');
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
