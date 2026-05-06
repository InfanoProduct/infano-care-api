import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const deleted = await prisma.learningJourney.delete({
      where: { slug: 'peer-mentor-certification' }
    });
    console.log('Deleted journey:', deleted.slug);
  } catch (e) {
    console.log('Journey already deleted or not found.');
  }
}

main().finally(() => prisma.$disconnect());
