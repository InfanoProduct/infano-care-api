import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkCircles() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log('Fetching circles from database...');
    const circles = await prisma.communityCircle.findMany();
    console.log('Total circles found:', circles.length);
    if (circles.length > 0) {
      console.log('Circles:', JSON.stringify(circles, null, 2));
    }
  } catch (error) {
    console.error('Error fetching circles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCircles();
