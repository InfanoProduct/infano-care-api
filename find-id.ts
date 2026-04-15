import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findUserId() {
  const user = await prisma.user.findFirst({ where: { phone: '+911112223333' } });
  if (user) console.log(user.id);
  else console.log('User not found');
}

findUserId().finally(() => prisma.$disconnect());
