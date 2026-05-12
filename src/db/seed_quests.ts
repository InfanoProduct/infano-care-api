import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Quest Templates and Badges...");

  // 1. Create Badges
  const badges = [
    {
      slug: "period-pioneer",
      name: "Period Pioneer",
      description: "Logged your first period log ever",
      collection: "body_knowledge",
      rarity: "common",
      illustrationUrl: "https://api.infano.care/assets/badges/period_pioneer.png",
      conditionFnId: "first_period_log",
    },
    {
      slug: "hormone-harmony",
      name: "Hormone Harmony",
      description: "Completed the 'My Changing Body' journey",
      collection: "body_knowledge",
      rarity: "rare",
      illustrationUrl: "https://api.infano.care/assets/badges/hormone_harmony.png",
      conditionFnId: "journey_complete_body",
    },
    {
      slug: "emotion-explorer",
      name: "Emotion Explorer",
      description: "Logged your mood for the first time",
      collection: "mind_soul",
      rarity: "common",
      illustrationUrl: "https://api.infano.care/assets/badges/emotion_explorer.png",
      conditionFnId: "first_mood_log",
    },
    {
      slug: "streak-keeper",
      name: "Streak Keeper",
      description: "Log your cycle for 7 consecutive days",
      collection: "streak",
      rarity: "rare",
      illustrationUrl: "https://api.infano.care/assets/badges/streak_keeper.png",
      conditionFnId: "log_streak_7",
    },
    {
      slug: "community-pillar",
      name: "Community Pillar",
      description: "Left 10 supportive comments in the community",
      collection: "community",
      rarity: "epic",
      illustrationUrl: "https://api.infano.care/assets/badges/community_pillar.png",
      conditionFnId: "community_support_10",
    },
  ];

  for (const b of badges) {
    await prisma.badge.upsert({
      where: { slug: b.slug },
      update: b,
      create: b,
    });
  }

  const badgeMap = await prisma.badge.findMany().then((bs) => 
    Object.fromEntries(bs.map((b) => [b.slug, b.id]))
  );

  // 2. Create Quest Templates
  const questTemplates = [
    {
      type: "daily",
      category: "tracker",
      title: "Period Pioneer",
      description: "Log today's period flow, symptoms, and mood",
      pointsBase: 50,
      difficulty: "quick",
      estimatedMinutes: 2,
      completionCondition: { type: "event", event: "log_saved", count: 1 },
      phaseWeights: { menstrual: 1.5, follicular: 1, ovulation: 1, luteal: 1 },
    },
    {
      type: "daily",
      category: "learning",
      title: "Episode Explorer",
      description: "Complete the next episode in any active Learning Journey",
      pointsBase: 75,
      difficulty: "standard",
      estimatedMinutes: 7,
      completionCondition: { type: "event", event: "episode_completed", count: 1 },
      phaseWeights: { menstrual: 1, follicular: 1.2, ovulation: 1, luteal: 1 },
    },
    {
      type: "daily",
      category: "wellbeing",
      title: "Mindful Minute",
      description: "Complete today's guided 1-minute mindfulness exercise",
      pointsBase: 30,
      difficulty: "quick",
      estimatedMinutes: 1,
      completionCondition: { type: "event", event: "mindfulness_completed", count: 1 },
      phaseWeights: { menstrual: 1.2, follicular: 1, ovulation: 1, luteal: 1.2 },
    },
    {
      type: "weekly",
      category: "tracker",
      title: "7-Day Bloom",
      description: "Log your cycle for 7 consecutive days",
      pointsBase: 250,
      difficulty: "challenge",
      estimatedMinutes: 15,
      completionCondition: { type: "streak", event: "log_streak", count: 7 },
      badgeRewardId: badgeMap["streak-keeper"],
    },
    {
      type: "milestone",
      category: "community",
      title: "Community Pillar",
      description: "Help 10 friends with supportive comments",
      pointsBase: 300,
      difficulty: "challenge",
      estimatedMinutes: 60,
      completionCondition: { type: "accumulation", event: "supportive_comment", count: 10 },
      badgeRewardId: badgeMap["community-pillar"],
    },
  ];

  for (const q of questTemplates) {
    await prisma.questTemplate.create({
      data: q,
    });
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
