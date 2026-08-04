'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const badges = [
  {
    id: '1d809215-1a62-4237-b1eb-8b85a5a38f36',
    name: 'Period Pioneer',
    description: 'Log your cycle and symptoms to analyze your rhythm.',
    rarity: 'rare',
    collection: 'Cycle Master',
    isAnimated: false,
    illustrationUrl: '',
    slug: 'period-pioneer',
  },
  {
    id: '5d9aa7e4-017b-419f-845c-64573b3dfc81',
    name: 'Community Pillar',
    description: 'Contribute actively to the community by connecting and encouraging peers.',
    rarity: 'epic',
    collection: 'Social Star',
    isAnimated: false,
    illustrationUrl: '',
    slug: 'community-pillar',
  },
  {
    id: '13995d30-a5c2-4504-8375-1a47029fe71d',
    name: 'Streak Champion',
    description: 'Keep your daily check-in streak alive.',
    rarity: 'legendary',
    collection: 'Dedication',
    isAnimated: false,
    illustrationUrl: '',
    slug: 'streak-champion',
  },
  {
    id: 'badge_knowledge_seeker',
    name: 'Knowledge Seeker',
    description: 'Read and complete educational episodes to expand your knowledge.',
    rarity: 'common',
    collection: 'Adventures',
    isAnimated: false,
    illustrationUrl: '',
    slug: 'knowledge-seeker',
  },
];

const questTemplates = [
  // ── TRACKER (2 slots per day) ──────────────────────────────────────────
  {
    type: 'daily',
    category: 'tracker',
    title: 'Log Your Day',
    description: 'Track your flow, mood, or symptoms in the tracker today.',
    pointsBase: 75,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 2,
    completionCondition: { event: 'log_saved', count: 1 },
    phaseWeights: { menstrual: 3, follicular: 2, ovulation: 2, luteal: 2, waiting: 2 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'tracker',
    title: 'Mood Check-In',
    description: "Record how you are feeling emotionally in the tracker.",
    pointsBase: 50,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 2,
    completionCondition: { event: 'log_saved', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 2, ovulation: 1, luteal: 3, waiting: 2 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'tracker',
    title: 'Symptom Snapshot',
    description: 'Log at least one symptom to understand your body better.',
    pointsBase: 60,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 3,
    completionCondition: { event: 'log_saved', count: 1 },
    phaseWeights: { menstrual: 3, follicular: 1, ovulation: 1, luteal: 3, waiting: 1 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'tracker',
    title: 'Energy Level Log',
    description: 'Track your energy level today and spot your cycle patterns.',
    pointsBase: 50,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 2,
    completionCondition: { event: 'log_saved', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 3, ovulation: 3, luteal: 2, waiting: 1 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'tracker',
    title: 'Sleep Quality Check',
    description: 'Log your sleep hours and quality to understand rest patterns.',
    pointsBase: 60,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 2,
    completionCondition: { event: 'log_saved', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 1, ovulation: 1, luteal: 3, waiting: 2 },
    isActive: true,
  },

  // ── LEARNING (2 slots per day) ─────────────────────────────────────────
  {
    type: 'daily',
    category: 'learning',
    title: 'Learn Something New',
    description: 'Complete one learning episode to grow your knowledge.',
    pointsBase: 75,
    difficulty: 'standard',
    minLevel: 1,
    estimatedMinutes: 10,
    completionCondition: { event: 'episode_completed', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 3, ovulation: 2, luteal: 1, waiting: 3 },
    isActive: true,
    badgeRewardId: 'badge_knowledge_seeker',
  },
  {
    type: 'daily',
    category: 'learning',
    title: 'Read & Reflect',
    description: 'Complete a learning episode and add a reflection.',
    pointsBase: 100,
    difficulty: 'standard',
    minLevel: 1,
    estimatedMinutes: 15,
    completionCondition: { event: 'reflection_added', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 2, ovulation: 2, luteal: 2, waiting: 3 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'learning',
    title: 'Mindful Minutes',
    description: 'Watch a mindful video to care for your mental wellness.',
    pointsBase: 75,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 5,
    completionCondition: { event: 'mindfulness_completed', count: 1 },
    phaseWeights: { menstrual: 3, follicular: 2, ovulation: 1, luteal: 3, waiting: 2 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'learning',
    title: 'Knowledge Explorer',
    description: 'Complete 2 learning episodes today.',
    pointsBase: 120,
    difficulty: 'challenge',
    minLevel: 2,
    estimatedMinutes: 20,
    completionCondition: { event: 'episode_completed', count: 2 },
    phaseWeights: { menstrual: 1, follicular: 3, ovulation: 2, luteal: 1, waiting: 2 },
    isActive: true,
  },

  // ── COMMUNITY (2 slots per day) ────────────────────────────────────────
  {
    type: 'daily',
    category: 'community',
    title: 'Connect & Share',
    description: 'Post in a community circle to share your thoughts.',
    pointsBase: 75,
    difficulty: 'standard',
    minLevel: 1,
    estimatedMinutes: 5,
    completionCondition: { event: 'post_created', count: 1 },
    phaseWeights: { menstrual: 1, follicular: 3, ovulation: 3, luteal: 1, waiting: 2 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'community',
    title: 'Support a Friend',
    description: 'Reply to someone post and offer encouragement.',
    pointsBase: 60,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 3,
    completionCondition: { event: 'reply_created', count: 1 },
    phaseWeights: { menstrual: 1, follicular: 2, ovulation: 3, luteal: 2, waiting: 2 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'community',
    title: 'Explore the Feed',
    description: 'Browse the community feed and engage with 3 posts.',
    pointsBase: 50,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 5,
    completionCondition: { event: 'community_reaction_added', count: 3 },
    phaseWeights: { menstrual: 2, follicular: 2, ovulation: 2, luteal: 2, waiting: 2 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'community',
    title: 'PeerLine Connection',
    description: 'Start a PeerLine session to connect with a peer mentor.',
    pointsBase: 100,
    difficulty: 'standard',
    minLevel: 2,
    estimatedMinutes: 15,
    completionCondition: { event: 'peerline_session_started', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 2, ovulation: 2, luteal: 3, waiting: 2 },
    isActive: true,
  },

  // ── WELLBEING (1 slot per day) ─────────────────────────────────────────
  {
    type: 'daily',
    category: 'wellbeing',
    title: 'Gratitude Moment',
    description: 'Write a short note about something you are grateful for today.',
    pointsBase: 50,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 3,
    completionCondition: { event: 'log_saved', count: 1 },
    phaseWeights: { menstrual: 3, follicular: 2, ovulation: 2, luteal: 3, waiting: 2 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'wellbeing',
    title: 'Breathe & Reset',
    description: 'Take 5 minutes to do a calming breathing exercise.',
    pointsBase: 50,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 5,
    completionCondition: { event: 'mindfulness_completed', count: 1 },
    phaseWeights: { menstrual: 3, follicular: 1, ovulation: 2, luteal: 3, waiting: 2 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'wellbeing',
    title: 'Hydration Hero',
    description: 'Track your wellness and stay hydrated today.',
    pointsBase: 40,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 2,
    completionCondition: { event: 'log_saved', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 2, ovulation: 2, luteal: 2, waiting: 2 },
    isActive: true,
  },

  // ── WILDCARD (1 slot per day) ──────────────────────────────────────────
  {
    type: 'daily',
    category: 'wildcard',
    title: 'Daily Streak',
    description: 'Complete any activity in the app to keep your streak alive.',
    pointsBase: 30,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 2,
    completionCondition: { event: 'log_saved', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 2, ovulation: 2, luteal: 2, waiting: 2 },
    isActive: true,
    badgeRewardId: '13995d30-a5c2-4504-8375-1a47029fe71d',
  },
  {
    type: 'daily',
    category: 'wildcard',
    title: 'Curiosity Quest',
    description: 'Explore a new section of the app you haven\'t visited today.',
    pointsBase: 50,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 3,
    completionCondition: { event: 'episode_completed', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 3, ovulation: 2, luteal: 1, waiting: 3 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'wildcard',
    title: 'Super Achiever',
    description: 'Complete 3 other quests today.',
    pointsBase: 150,
    difficulty: 'challenge',
    minLevel: 3,
    estimatedMinutes: 30,
    completionCondition: { event: 'quests_completed', count: 3 },
    phaseWeights: { menstrual: 1, follicular: 3, ovulation: 3, luteal: 1, waiting: 2 },
    isActive: true,
  },
];

async function seed() {
  console.log('🌱 Seeding badges and quest templates...');

  // Clear existing templates and badges
  await prisma.userDailyQuest.deleteMany({});
  await prisma.userBadgeProgress.deleteMany({});
  await prisma.userBadge.deleteMany({});
  await prisma.questTemplate.deleteMany({});
  await prisma.badge.deleteMany({});
  console.log('Cleared existing Quest, Badge, and Progress data.');

  // Seed Badges
  let createdBadges = 0;
  for (const badge of badges) {
    try {
      await prisma.badge.create({ data: badge });
      createdBadges++;
    } catch (e) {
      console.error(`Failed to create badge "${badge.name}":`, e.message);
    }
  }
  console.log(`✅ Created ${createdBadges} badges.`);

  // Seed Quest Templates
  let createdQuests = 0;
  for (const template of questTemplates) {
    try {
      await prisma.questTemplate.create({ data: template });
      createdQuests++;
    } catch (e) {
      console.error(`Failed to create template "${template.title}":`, e.message);
    }
  }
  console.log(`✅ Created ${createdQuests} quest templates.`);

  // Summary
  const counts = await prisma.questTemplate.groupBy({
    by: ['category'],
    _count: true,
  });
  console.log('\n📊 Templates by category:');
  counts.forEach(c => console.log(`  ${c.category}: ${c._count}`));

  await prisma.$disconnect();
}

seed().catch(e => {
  console.error('Seed failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
