/**
 * Seed script: migrates the hardcoded DAILY_INSIGHTS_LIBRARY into the database.
 * Run with: npx ts-node -r tsconfig-paths/register src/modules/tracker/tracker_content.seed.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedData = [
  // ── Menstrual ──────────────────────────────────────────────────────────────
  {
    phase: 'menstrual',
    previewTitle: 'Self-Care Mode',
    previewEmoji: '🕯️',
    previewColorHex: '#F472B6',
    sortOrder: 0,
    stories: [
      {
        order: 0,
        title: 'Inner Reflection',
        content:
          "Your body is working hard right now. This is a natural time for rest and inward reflection. Don't feel guilty about taking it slow.",
      },
      {
        order: 1,
        title: 'Hydration is Key',
        content:
          'Drinking warm water can help soothe cramps and keep you hydrated. Add a slice of ginger for extra comfort.',
      },
    ],
  },
  // ── Follicular ─────────────────────────────────────────────────────────────
  {
    phase: 'follicular',
    previewTitle: "Today's Energy",
    previewEmoji: '⚡',
    previewColorHex: '#EAB308',
    sortOrder: 0,
    stories: [
      {
        order: 0,
        title: 'Energy Peak',
        content:
          'You are entering your follicular phase! Estrogen is rising, which means you might experience a surge in energy and creativity today.',
      },
      {
        order: 1,
        title: 'Movement Tip',
        content:
          "It's a great day for a high-intensity workout. Try a new class or go for a run. Your body is primed for action.",
      },
    ],
  },
  // ── Ovulation ──────────────────────────────────────────────────────────────
  {
    phase: 'ovulation',
    previewTitle: 'Radiant Glow',
    previewEmoji: '✨',
    previewColorHex: '#8B5CF6',
    sortOrder: 0,
    stories: [
      {
        order: 0,
        title: 'Social Battery',
        content:
          "Your social confidence is likely at its peak. It's a perfect time for presentations, dates, or meeting new people!",
      },
    ],
  },
  // ── Luteal ─────────────────────────────────────────────────────────────────
  {
    phase: 'luteal',
    previewTitle: 'Slow Down',
    previewEmoji: '☁️',
    previewColorHex: '#6366F1',
    sortOrder: 0,
    stories: [
      {
        order: 0,
        title: 'Patience Practice',
        content:
          'As progesterone rises, you might feel more sensitive. Be extra kind to yourself today.',
      },
    ],
  },
];

const articleData = [
  // Menstrual
  { phase: 'menstrual', title: 'Iron-rich foods for your period', readTime: '4 min read', emoji: '🥩', sortOrder: 0 },
  { phase: 'menstrual', title: 'Gentle yoga for cramps', readTime: '5 min read', emoji: '🧘‍♀️', sortOrder: 1 },
  { phase: 'menstrual', title: 'Understanding heavy flow', readTime: '3 min read', emoji: '💧', sortOrder: 2 },
  // Follicular
  { phase: 'follicular', title: 'Setting goals this month', readTime: '3 min read', emoji: '🚀', sortOrder: 0 },
  { phase: 'follicular', title: 'The power of estrogen', readTime: '5 min read', emoji: '⚡', sortOrder: 1 },
  { phase: 'follicular', title: 'New routines to try', readTime: '4 min read', emoji: '✨', sortOrder: 2 },
  // Ovulation
  { phase: 'ovulation', title: 'Signs you are ovulating', readTime: '4 min read', emoji: '🥚', sortOrder: 0 },
  { phase: 'ovulation', title: 'Maximizing your energy', readTime: '3 min read', emoji: '🔥', sortOrder: 1 },
  { phase: 'ovulation', title: 'Skin glow tips', readTime: '2 min read', emoji: '✨', sortOrder: 2 },
  // Luteal
  { phase: 'luteal', title: 'Managing PMS mood swings', readTime: '5 min read', emoji: '☁️', sortOrder: 0 },
  { phase: 'luteal', title: 'Pre-period snack guide', readTime: '4 min read', emoji: '🍫', sortOrder: 1 },
  { phase: 'luteal', title: 'Sleep better tonight', readTime: '3 min read', emoji: '🌙', sortOrder: 2 },
  // Waiting
  { phase: 'waiting', title: 'Understanding cycle variations', readTime: '4 min read', emoji: '📊', sortOrder: 0 },
];

async function main() {
  console.log('🌱 Seeding tracker content...');

  // Insights + Stories
  for (const insight of seedData) {
    const { stories, ...insightData } = insight;
    const created = await prisma.trackerInsight.create({
      data: {
        ...insightData,
        stories: {
          create: stories,
        },
      },
    });
    console.log(`✅ Created insight: ${created.previewTitle} [${created.phase}]`);
  }

  // Articles
  for (const article of articleData) {
    const created = await prisma.trackerArticle.create({ data: article });
    console.log(`✅ Created article: ${created.title} [${created.phase}]`);
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
