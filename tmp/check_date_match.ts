import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = "ec29fcf9-0837-4a63-8b8c-d03d9f804c87";
  const profile = await prisma.cycleProfile.findUnique({ where: { userId } });
  
  console.log("Current Profile Date Check:");
  console.log("lastLogDate (Raw):", profile?.lastLogDate);
  if (profile?.lastLogDate) {
    const d = new Date(profile.lastLogDate);
    console.log("lastLogDate (as Date object):", d.toISOString());
    console.log("lastLogDate (getTime):", d.getTime());
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  console.log("Today (UTC Midnight):", today.toISOString());
  console.log("Today (getTime):", today.getTime());
  
  const match = profile?.lastLogDate && new Date(profile.lastLogDate).getTime() === today.getTime();
  console.log("Does it match? ", match);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
