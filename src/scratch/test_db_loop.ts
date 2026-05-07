import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  for (let i = 0; i < 5; i++) {
    console.log(`Test ${i + 1}...`);
    try {
      const result = await prisma.$queryRaw`SELECT 1`;
      console.log('Success:', result);
    } catch (error: any) {
      console.error('Failed:', error.message);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  await prisma.$disconnect();
}

main();
