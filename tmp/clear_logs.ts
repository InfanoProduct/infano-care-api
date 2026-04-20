import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = "ec29fcf9-0837-4a63-8b8c-d03d9f804c87"; // Your target user ID
  
  console.log(`Clearing potentially corrupted logs for User: ${userId}`);
  const result = await prisma.cycleLog.deleteMany({
    where: { userId }
  });
  
  console.log(`Deleted ${result.count} logs. You can now start fresh!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
