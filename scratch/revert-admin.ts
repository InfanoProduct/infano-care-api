import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    data: { role: 'TEEN' }
  });
  console.log('Reverted users to TEEN:', result.count);
  
  // Optional: If you want to keep a specific user as ADMIN, add it here.
  // const adminEmail = '...';
  // await prisma.user.update({ where: { username: adminEmail }, data: { role: 'ADMIN' } });
}

main().finally(() => prisma.$disconnect());
