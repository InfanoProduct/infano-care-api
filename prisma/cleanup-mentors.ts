import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up PeerLine mentor users...');
  
  const deleted = await prisma.user.deleteMany({
    where: {
      OR: [
        { username: 'mentor@peerline.com' },
        { username: { contains: 'mentor' } }
      ],
      role: 'EXPERT'
    }
  });

  console.log(`Deleted ${deleted.count} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
