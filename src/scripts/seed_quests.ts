import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding quest templates and badges...");

  // ── Badges ────────────────────────────────────────────────────────────────
  const badges = [
    {
      slug: "first-log",
      name: "First Log",
      description: "Logged your first cycle day",
      collection: "streak",
      rarity: "common",
    },
    {
      slug: "week-warrior",
      name: "Week Warrior",
      description: "Completed quests 7 days in a row",
      collection: "streak",
      rarity: "rare",
    },
    {
      slug: "curious-mind",
      name: "Curious Mind",
      description: "Completed your first Learning episode",
      collection: "learning",
      rarity: "common",
    },
    {
      slug: "knowledge-seeker",
      name: "Knowledge Seeker",
      description: "Completed 5 Learning episodes",
      collection: "learning",
      rarity: "rare",
    },
    {
      slug: "community-voice",
      name: "Community Voice",
      description: "Made your first post in a Circle",
      collection: "community",
      rarity: "common",
    },
    {
      slug: "body-wise",
      name: "Body Wise",
      description: "Tracked 10 cycle days",
      collection: "body_knowledge",
      rarity: "rare",
    },
    {
      slug: "wellbeing-champion",
      name: "Wellbeing Champion",
      description: "Completed 5 wellbeing quests",
      collection: "mind_soul",
      rarity: "rare",
    },
    {
      slug: "quest-legend",
      name: "Quest Legend",
      description: "Completed 30 daily quests total",
      collection: "special",
      rarity: "legendary",
    },
  ];

  const createdBadges: Record<string, string> = {};
  for (const b of badges) {
    const badge = await prisma.badge.upsert({
      where: { slug: b.slug },
      update: {},
      create: b,
    });
    createdBadges[b.slug] = badge.id;
    console.log(`  ✅ Badge: ${b.name}`);
  }

  // ── Quest Templates ────────────────────────────────────────────────────────
  const templates = [
    // ── TRACKER ──
    {
      type: "daily",
      category: "tracker",
      title: "Log Today's Flow",
      description: "Open the tracker and log your period flow for today.",
      pointsBase: 75,
      difficulty: "quick",
      estimatedMinutes: 2,
      completionCondition: { type: "event", event: "cycle_logged", count: 1 },
      phaseWeights: { menstrual: 3, follicular: 1, ovulation: 1, luteal: 1 },
      badgeRewardId: createdBadges["first-log"],
    },
    {
      type: "daily",
      category: "tracker",
      title: "Track Your Mood",
      description: "Log how you're feeling today in the tracker.",
      pointsBase: 50,
      difficulty: "quick",
      estimatedMinutes: 2,
      completionCondition: { type: "event", event: "cycle_logged", count: 1 },
      phaseWeights: { menstrual: 2, follicular: 2, ovulation: 1, luteal: 3 },
    },
    {
      type: "daily",
      category: "tracker",
      title: "Log Symptoms & Energy",
      description: "Record your symptoms and energy level for the day.",
      pointsBase: 60,
      difficulty: "quick",
      estimatedMinutes: 3,
      completionCondition: { type: "event", event: "cycle_logged", count: 1 },
      phaseWeights: { menstrual: 3, follicular: 1, ovulation: 1, luteal: 2 },
    },
    {
      type: "daily",
      category: "tracker",
      title: "Check Your Cycle Insights",
      description: "Visit the Calendar view and explore your cycle predictions.",
      pointsBase: 40,
      difficulty: "quick",
      estimatedMinutes: 3,
      completionCondition: { type: "event", event: "cycle_logged", count: 1 },
      phaseWeights: { menstrual: 1, follicular: 2, ovulation: 2, luteal: 1 },
      badgeRewardId: createdBadges["body-wise"],
    },

    // ── LEARNING ──
    {
      type: "daily",
      category: "learning",
      title: "Learn Something New",
      description: "Complete any episode in the Learning section.",
      pointsBase: 75,
      difficulty: "standard",
      estimatedMinutes: 10,
      completionCondition: { type: "event", event: "episode_completed", count: 1 },
      phaseWeights: { menstrual: 1, follicular: 3, ovulation: 2, luteal: 1 },
      badgeRewardId: createdBadges["curious-mind"],
    },
    {
      type: "daily",
      category: "learning",
      title: "Read an Article",
      description: "Open and read any article in the Tracker's article section.",
      pointsBase: 50,
      difficulty: "quick",
      estimatedMinutes: 5,
      completionCondition: { type: "event", event: "episode_completed", count: 1 },
      phaseWeights: { menstrual: 2, follicular: 2, ovulation: 2, luteal: 2 },
    },
    {
      type: "daily",
      category: "learning",
      title: "Mindful Watch",
      description: "Watch a Mindful Minutes video and earn your daily calm.",
      pointsBase: 75,
      difficulty: "standard",
      estimatedMinutes: 8,
      completionCondition: { type: "event", event: "mindful_completed", count: 1 },
      phaseWeights: { menstrual: 3, follicular: 1, ovulation: 1, luteal: 3 },
      badgeRewardId: createdBadges["knowledge-seeker"],
    },
    {
      type: "daily",
      category: "learning",
      title: "Continue Your Journey",
      description: "Pick up where you left off in any learning journey.",
      pointsBase: 60,
      difficulty: "standard",
      estimatedMinutes: 10,
      completionCondition: { type: "event", event: "episode_completed", count: 1 },
      phaseWeights: { menstrual: 1, follicular: 3, ovulation: 2, luteal: 1 },
    },

    // ── COMMUNITY ──
    {
      type: "daily",
      category: "community",
      title: "Post in a Circle",
      description: "Share something with your community in any Circle.",
      pointsBase: 60,
      difficulty: "standard",
      estimatedMinutes: 5,
      completionCondition: { type: "event", event: "community_posted", count: 1 },
      phaseWeights: { menstrual: 1, follicular: 2, ovulation: 3, luteal: 1 },
      badgeRewardId: createdBadges["community-voice"],
    },
    {
      type: "daily",
      category: "community",
      title: "React to a Post",
      description: "React to someone's post in the community with a heart or hug.",
      pointsBase: 30,
      difficulty: "quick",
      estimatedMinutes: 2,
      completionCondition: { type: "event", event: "community_reacted", count: 1 },
      phaseWeights: { menstrual: 1, follicular: 2, ovulation: 3, luteal: 1 },
    },
    {
      type: "daily",
      category: "community",
      title: "Connect via PeerLine",
      description: "Visit the PeerLine tab and explore available mentors.",
      pointsBase: 40,
      difficulty: "quick",
      estimatedMinutes: 3,
      completionCondition: { type: "event", event: "community_posted", count: 1 },
      phaseWeights: { menstrual: 1, follicular: 1, ovulation: 2, luteal: 2 },
    },

    // ── WELLBEING ──
    {
      type: "daily",
      category: "wellbeing",
      title: "Breathing Break",
      description: "Take 2 minutes to breathe deeply and check in with yourself.",
      pointsBase: 50,
      difficulty: "quick",
      estimatedMinutes: 2,
      completionCondition: { type: "event", event: "wellbeing_checkin", count: 1 },
      phaseWeights: { menstrual: 3, follicular: 1, ovulation: 1, luteal: 3 },
      badgeRewardId: createdBadges["wellbeing-champion"],
    },
    {
      type: "daily",
      category: "wellbeing",
      title: "Hydration Check",
      description: "Drink a glass of water and log your energy level today.",
      pointsBase: 30,
      difficulty: "quick",
      estimatedMinutes: 1,
      completionCondition: { type: "event", event: "cycle_logged", count: 1 },
      phaseWeights: { menstrual: 2, follicular: 2, ovulation: 2, luteal: 2 },
    },

    // ── WILDCARD ──
    {
      type: "daily",
      category: "wildcard",
      title: "Explorer's Quest",
      description: "Try something new — visit a part of the app you haven't explored today.",
      pointsBase: 40,
      difficulty: "quick",
      estimatedMinutes: 3,
      completionCondition: { type: "event", event: "cycle_logged", count: 1 },
      phaseWeights: { menstrual: 1, follicular: 1, ovulation: 1, luteal: 1 },
    },
    {
      type: "daily",
      category: "wildcard",
      title: "Daily Streak",
      description: "Open the app and engage with any feature to keep your streak alive.",
      pointsBase: 25,
      difficulty: "quick",
      estimatedMinutes: 1,
      completionCondition: { type: "event", event: "cycle_logged", count: 1 },
      phaseWeights: { menstrual: 1, follicular: 1, ovulation: 1, luteal: 1 },
      badgeRewardId: createdBadges["quest-legend"],
    },
  ];

  let created = 0;
  for (const t of templates) {
    // Use title+category as a natural unique key to allow re-running safely
    const existing = await prisma.questTemplate.findFirst({
      where: { title: t.title, category: t.category },
    });
    if (!existing) {
      await prisma.questTemplate.create({ data: t as any });
      console.log(`  ✅ Quest: [${t.category}] ${t.title}`);
      created++;
    } else {
      console.log(`  ⏭️  Skipped (exists): [${t.category}] ${t.title}`);
    }
  }

  console.log(`\n🎉 Done! Created ${created} new quest templates.`);
  console.log(`   Total badges seeded: ${badges.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
