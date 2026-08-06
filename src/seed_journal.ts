import { prisma } from "./db/client.js";
import { PROMPT_BANK } from "./modules/journal/journal.service.js";

async function main() {
  console.log("Seeding journal prompts into database...");
  
  // Clear old prompts to ensure exact match with the new 60 prompts bank
  await prisma.journalPrompt.deleteMany({});

  await prisma.journalPrompt.createMany({
    data: PROMPT_BANK.map((p, i) => ({
      category: p.category,
      text: p.text,
      bestModes: p.bestModes as any[],
      options: p.options || [],
      isActive: true,
      sortOrder: i,
    })),
  });

  const count = await prisma.journalPrompt.count();
  console.log(`Successfully seeded ${count} journal prompts into database! 🎉`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding journal prompts:", err);
  process.exit(1);
});
