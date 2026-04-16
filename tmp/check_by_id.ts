import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const logId = "b4316fe5-89c3-4d28-ad1a-f01a3f16df65";
  const log = await prisma.cycleLog.findUnique({
    where: { id: logId }
  });

  console.log("Log Details for ID:", logId);
  console.log(JSON.stringify(log, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
