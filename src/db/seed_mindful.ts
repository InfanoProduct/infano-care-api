import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Mindful Activities...");

  const activities = [
    {
      title: "Breathing for Balance",
      description: "A calming 4-7-8 breathing technique to help you find your center and reduce stress instantly. Perfect for a quick mid-day break.",
      videoUrl: "https://www.youtube.com/watch?v=5DqTuWve9t8",
      thumbnailUrl: "http://192.168.1.43:4005/uploads/mindful_breathing.png",
      expertName: "Dr. Sarah Miller",
      duration: 5,
      category: "Breathing",
      points: 30,
    },
    {
      title: "Self-Love Meditation",
      description: "A gentle guided meditation focused on cultivating kindness towards yourself and embracing your unique journey.",
      videoUrl: "https://www.youtube.com/watch?v=itZMM5gC6-s",
      thumbnailUrl: "http://192.168.1.43:4005/uploads/mindful_meditation.png",
      expertName: "Anya Sharma",
      duration: 10,
      category: "Meditation",
      points: 50,
    }
  ];

  for (const a of activities) {
    await prisma.mindfulActivity.upsert({
      where: { id: a.title }, // This is a hack, usually we'd use a real ID or slug
      // But since we don't have IDs yet, we'll use findFirst/create
      update: a,
      create: a,
    } as any);
  }

  // Proper way for seed without known IDs:
  for (const a of activities) {
    const existing = await prisma.mindfulActivity.findFirst({
        where: { title: a.title }
    });
    if (existing) {
        await prisma.mindfulActivity.update({
            where: { id: existing.id },
            data: a
        });
    } else {
        await prisma.mindfulActivity.create({
            data: a
        });
    }
  }

  console.log("Mindful Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
