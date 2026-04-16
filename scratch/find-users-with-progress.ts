import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function findUsersWithProgress() {
  try {
    const usersWithProgress = await prisma.userProgress.findMany({
      include: {
        user: {
          select: { id: true, phone: true }
        }
      }
    });

    console.log('Users with learning progress:');
    const uniqueUsers = new Set();
    usersWithProgress.forEach(p => {
      uniqueUsers.add(`${p.user.id} | ${p.user.phone}`);
    });

    uniqueUsers.forEach(u => console.log(u));

    console.log(`Total progress records found: ${usersWithProgress.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findUsersWithProgress();
