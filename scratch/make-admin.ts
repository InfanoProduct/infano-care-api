import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    data: { role: 'ADMIN' }
  });
  console.log('Updated users to ADMIN:', result.count);
}

main().finally(() => prisma.$disconnect());
