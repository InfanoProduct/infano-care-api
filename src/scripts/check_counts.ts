import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.questTemplate.count();
  const badges = await prisma.badge.count();
  console.log(`- QuestTemplates: ${templates}`);
  console.log(`- Badges: ${badges}`);
}

main().finally(() => prisma.$disconnect());
