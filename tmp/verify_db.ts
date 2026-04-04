import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.cycleLog.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      date: true,
      flow: true,
      moodPrimary: true,
      energyLevel: true,
      sleepHours: true,
      noteCiphertext: true,
      createdAt: true,
      userId: true
    }
  });

  if (logs.length === 0) {
    console.log("No logs found in the database.");
    return;
  }

  console.log(`Found ${logs.length} latest logs:`);
  logs.forEach((log, i) => {
    console.log(`\n--- Log ${i + 1} ---`);
    console.log(`ID: ${log.id}`);
    console.log(`Date: ${log.date.toISOString()}`);
    console.log(`Created At: ${log.createdAt.toISOString()}`);
    console.log(`User ID: ${log.userId}`);
    console.log(`Flow: ${log.flow}`);
    console.log(`Mood Primary: ${log.moodPrimary}`);
    console.log(`Energy Level: ${log.energyLevel}`);
    console.log(`Sleep Hours: ${log.sleepHours}`);
    console.log(`Note Text: ${log.noteCiphertext ? "Encrypted Length: " + log.noteCiphertext.length : "null"}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
