import { PrismaClient } from "@prisma/client";
import { TrackerService } from "../src/modules/tracker/tracker.service.js";

const prisma = new PrismaClient();

async function main() {
  const userId = "ec29fcf9-0837-4a63-8b8c-d03d9f804c87"; // From previous verification
  const details = {
    date: "2026-04-04T12:00:00.000Z",
    moodPrimary: "excited",
    energyLevel: 4,
    sleepHours: 7.5,
    noteText: "Testing manual save via script"
  };

  console.log("Simulating logDaily with details:", details);
  const result = await TrackerService.logDaily(userId, details);
  console.log("Result:", result);

  const savedLog = await prisma.cycleLog.findUnique({
    where: {
      userId_date: {
        userId,
        date: new Date("2026-04-04 00:00:00Z") // Normalized date
      }
    }
  });

  console.log("\nVerifying saved log in DB:");
  console.log(JSON.stringify(savedLog, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
