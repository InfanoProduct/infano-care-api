import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function findEpisode1() {
  try {
    const episodes = await prisma.episode.findMany({
      where: { order: 1 },
      include: { journey: true }
    });

    console.log('Episodes with order 1:');
    episodes.forEach(e => {
      console.log(`ID: ${e.id} | Title: ${e.title} | Journey: ${e.journey.title}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findEpisode1();
