import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: '+919742802062' },
    include: {
      profile: true,
      cycleProfile: true,
      cycleLogs: {
        take: 5,
        orderBy: { date: 'desc' }
      }
    }
  });

  console.log(JSON.stringify(user, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
