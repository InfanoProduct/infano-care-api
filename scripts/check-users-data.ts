import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: {
      phone: { in: ["1234567890", "9999999999"] }
    },
    select: {
      id: true,
      phone: true,
      role: true
    }
  });

  console.log("USERS IN DB:");
  console.log(JSON.stringify(users, null, 2));

  const sessions = await prisma.expertChatSession.findMany({
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 3
      }
    }
  });

  console.log("\nSESSIONS AND RECENT MESSAGES:");
  console.log(JSON.stringify(sessions, null, 2));

  await prisma.$disconnect();
}

check();
