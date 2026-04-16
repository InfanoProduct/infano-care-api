import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.development' });
dotenv.config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function clearProgress(identifier: string) {
  try {
    // Search by ID or phone
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: identifier },
          { phone: identifier },
          { phone: `+91${identifier}` } // Try common Indian prefix
        ]
      },
      include: { profile: true }
    });

    if (!user) {
      console.log(`User with identifier ${identifier} not found.`);
      return;
    }

    console.log(`Found user: ${user.id} (Phone: ${user.phone}). Clearing progress...`);

    // 1. Delete UserProgress (using userId)
    const progressDeleted = await prisma.userProgress.deleteMany({
      where: { userId: user.id }
    });
    console.log(`Deleted ${progressDeleted.count} progress records.`);

    // 2. Delete Reflections
    const reflectionsDeleted = await prisma.reflection.deleteMany({
      where: { userId: user.id }
    });
    console.log(`Deleted ${reflectionsDeleted.count} reflection records.`);

    // 3. Reset Profile points
    if (user.profile) {
      await prisma.profile.update({
        where: { userId: user.id },
        data: { totalPoints: 0 }
      });
      console.log('Reset profile points to 0.');
    }

    console.log('Successfully cleared all learning journey data for this user.');

  } catch (error) {
    console.error('Error clearing progress:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const input = process.argv[2] || '1234567890';
clearProgress(input);
