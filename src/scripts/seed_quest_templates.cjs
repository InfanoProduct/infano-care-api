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
  // ── TRACKER (Period Tracker Quests) ──────────────────────────────────
  {
    type: 'daily',
    category: 'tracker',
    title: 'Track Your Periods',
    description: 'Set up your cycle profile and log your last period start to begin tracking.',
    pointsBase: 100,
    difficulty: 'standard',
    minLevel: 1,
    estimatedMinutes: 5,
    completionCondition: { event: 'cycle_setup_completed', count: 1 },
    phaseWeights: { menstrual: 1, follicular: 1, ovulation: 1, luteal: 1, waiting: 1 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'tracker',
    title: 'Log Symptoms & Mood',
    description: 'Log your daily symptoms, mood, and energy level today to track your rhythm.',
    pointsBase: 80,
    difficulty: 'standard',
    minLevel: 1,
    estimatedMinutes: 4,
    completionCondition: { event: 'log_saved', count: 1 },
    phaseWeights: { menstrual: 3, follicular: 2, ovulation: 2, luteal: 3, waiting: 2 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'tracker',
    title: 'Confirm Period End',
    description: 'Your period is marked as active. Update your cycle end date to keep predictions accurate.',
    pointsBase: 80,
    difficulty: 'standard',
    minLevel: 1,
    estimatedMinutes: 3,
    completionCondition: { event: 'period_end_marked', count: 1 },
    phaseWeights: { menstrual: 1, follicular: 1, ovulation: 1, luteal: 1, waiting: 1 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'tracker',
    title: 'Review Daily Insights',
    description: 'Read your customized hormone insights and self-care tips for today.',
    pointsBase: 60,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 2,
    completionCondition: { event: 'insights_viewed', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 2, ovulation: 2, luteal: 2, waiting: 2 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'tracker',
    title: 'Log Period Start',
    description: 'Your period is late. Log your period start or update your cycle data to keep predictions accurate.',
    pointsBase: 80,
    difficulty: 'standard',
    minLevel: 1,
    estimatedMinutes: 3,
    completionCondition: { event: 'period_start_marked', count: 1 },
    phaseWeights: { menstrual: 1, follicular: 1, ovulation: 1, luteal: 1, waiting: 1 },
    isActive: true,
  },

  // ── LEARNING (2 slots per day) ─────────────────────────────────────────
  {
    type: 'daily',
    category: 'learning',
    title: 'Explore Episode',
    description: 'Start reading the next episode in your learning journey.',
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
    title: 'Complete Node',
    description: 'Continue reading and complete the active node in your episode.',
    pointsBase: 75,
    difficulty: 'standard',
    minLevel: 1,
    estimatedMinutes: 8,
    completionCondition: { event: 'episode_completed', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 3, ovulation: 2, luteal: 1, waiting: 3 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'learning',
    title: 'Quiz Challenge',
    description: 'Complete the knowledge check quiz for your current episode.',
    pointsBase: 80,
    difficulty: 'standard',
    minLevel: 1,
    estimatedMinutes: 5,
    completionCondition: { event: 'quiz_completed', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 2, ovulation: 2, luteal: 2, waiting: 3 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'learning',
    title: 'Wisdom Journal',
    description: 'Add a reflection journal entry on your current episode.',
    pointsBase: 100,
    difficulty: 'standard',
    minLevel: 1,
    estimatedMinutes: 10,
    completionCondition: { event: 'reflection_added', count: 1 },
    phaseWeights: { menstrual: 2, follicular: 2, ovulation: 2, luteal: 2, waiting: 3 },
    isActive: true,
  },
  {
    type: 'daily',
    category: 'learning',
    title: 'Mindful Meditation',
    description: 'Take a mindfulness break and complete a meditation session.',
    pointsBase: 75,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 5,
    completionCondition: { event: 'mindfulness_completed', count: 1 },
    phaseWeights: { menstrual: 3, follicular: 2, ovulation: 1, luteal: 3, waiting: 2 },
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
    title: 'Gratitude Note',
    description: 'Write a gratitude note in your reflection journal today.',
    pointsBase: 60,
    difficulty: 'quick',
    minLevel: 1,
    estimatedMinutes: 3,
    completionCondition: { event: 'reflection_added', count: 1 },
    phaseWeights: { menstrual: 3, follicular: 2, ovulation: 2, luteal: 3, waiting: 2 },
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

const weeklyChallenges = [
  {
    title: 'Hydration Routine',
    description: 'Log your hydration tracker 5 times this week to establish habits.',
    targetTotal: 5,
    rewardPoints: 200,
    startsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    endsAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),  // 4 days from now
    category: 'tracker',
    completionCondition: { event: 'log_saved' },
    isActive: true
  },
  {
    title: 'Deep Mindful Hours',
    description: 'Listen and complete 3 mindfulness audio segments this week.',
    targetTotal: 3,
    rewardPoints: 250,
    startsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    endsAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    category: 'wellbeing',
    completionCondition: { event: 'mindfulness_completed' },
    isActive: true
  }
];

async function seed() {
  console.log('🌱 Seeding badges and quest templates...');

  // Clear existing templates and badges
  await prisma.userDailyQuest.deleteMany({});
  await prisma.userWeeklyChallenge.deleteMany({});
  await prisma.userBadgeProgress.deleteMany({});
  await prisma.userBadge.deleteMany({});
  await prisma.questTemplate.deleteMany({});
  await prisma.questWeeklyChallenge.deleteMany({});
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

  // Seed Weekly Challenges
  let createdWeekly = 0;
  for (const challenge of weeklyChallenges) {
    try {
      await prisma.questWeeklyChallenge.create({ data: challenge });
      createdWeekly++;
    } catch (e) {
      console.error(`Failed to create weekly challenge "${challenge.title}":`, e.message);
    }
  }
  console.log(`✅ Created ${createdWeekly} weekly challenges.`);

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
