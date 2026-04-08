import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const sessions = await prisma.chatSession.findMany();
    console.log(`✅ Table ChatSession exists. Found ${sessions.length} sessions.`);
  } catch (error: any) {
    console.error(`❌ Still failing: ${error.message}`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
