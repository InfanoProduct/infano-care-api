import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.learningJourney.deleteMany({
  where: { slug: 'peerline-mentor-certification' }
}).then(console.log)
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
