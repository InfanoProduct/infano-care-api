import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Quest Templates ---');

  const templates = [
    // TRACKER CATEGORY (Need at least 2)
    {
      id: 'template_tracker_log',
      type: 'daily',
      category: 'tracker',
      title: 'Daily Rhythm',
      description: 'Log your symptoms and mood to keep your cycle predictions accurate.',
      pointsBase: 75,
      estimatedMinutes: 2,
      difficulty: 'quick',
      completionCondition: { type: 'event', event: 'log_saved' },
    },
    {
      id: 'template_tracker_temp',
      type: 'daily',
      category: 'tracker',
      title: 'Body Insights',
      description: 'Record your basal body temperature or cervical mucus for deeper insights.',
      pointsBase: 75,
      estimatedMinutes: 3,
      difficulty: 'standard',
      completionCondition: { type: 'event', event: 'log_saved' },
    },

    // LEARNING CATEGORY (Need at least 2)
    {
      id: 'template_learning_watch',
      type: 'daily',
      category: 'learning',
      title: 'Watch & Learn',
      description: 'Complete one learning episode to expand your body literacy.',
      pointsBase: 75,
      estimatedMinutes: 5,
      difficulty: 'standard',
      completionCondition: { type: 'event', event: 'episode_completed' },
    },
    {
      id: 'template_learning_quiz',
      type: 'daily',
      category: 'learning',
      title: 'Knowledge Check',
      description: 'Test your understanding by completing a quiz after an episode.',
      pointsBase: 75,
      estimatedMinutes: 4,
      difficulty: 'standard',
      completionCondition: { type: 'event', event: 'episode_completed' },
    },

    // COMMUNITY CATEGORY (Need at least 2)
    {
      id: 'template_community_post',
      type: 'daily',
      category: 'community',
      title: 'Share Your Story',
      description: 'Create a new post in any circle to support others in the community.',
      pointsBase: 50,
      estimatedMinutes: 5,
      difficulty: 'challenge',
      completionCondition: { type: 'event', event: 'post_created' },
    },
    {
      id: 'template_community_reply',
      type: 'daily',
      category: 'community',
      title: 'Support a Friend',
      description: 'Reply to someone else\'s post to offer encouragement.',
      pointsBase: 50,
      estimatedMinutes: 2,
      difficulty: 'standard',
      completionCondition: { type: 'event', event: 'reply_created' },
    },

    // WELLBEING CATEGORY (Need 1)
    {
      id: 'template_wellbeing_mindful',
      type: 'daily',
      category: 'wellbeing',
      title: 'Mindful Moment',
      description: 'Take a 3-minute mindfulness break to center yourself.',
      pointsBase: 75,
      estimatedMinutes: 3,
      difficulty: 'quick',
      completionCondition: { type: 'event', event: 'mindfulness_completed' },
    },

    // WILDCARD CATEGORY (Need 1)
    {
      id: 'template_wildcard_friend',
      type: 'daily',
      category: 'wildcard',
      title: 'New Connection',
      description: 'Check your friend matches and send a wave to someone new.',
      pointsBase: 50,
      estimatedMinutes: 2,
      difficulty: 'quick',
      completionCondition: { type: 'event', event: 'match_action' },
    }
  ];

  for (const t of templates) {
    await prisma.questTemplate.upsert({
      where: { id: t.id },
      update: t,
      create: t,
    });
    console.log(`[SEED] Created template: ${t.title}`);
  }

  console.log('--- Seeding Badges ---');
  const badges = [
    {
      id: 'badge_early_bird',
      slug: 'early-bird',
      name: 'Early Bird',
      description: 'Awarded for logging 3 days in a row before 9 AM.',
      collection: 'streak',
      rarity: 'common',
      illustrationUrl: 'https://cdn-icons-png.flaticon.com/512/2913/2913092.png',
      conditionFnId: 'streak_3_early',
    },
    {
      id: 'badge_knowledge_seeker',
      slug: 'knowledge-seeker',
      name: 'Knowledge Seeker',
      description: 'Completed your first 5 learning episodes.',
      collection: 'learning',
      rarity: 'rare',
      illustrationUrl: 'https://cdn-icons-png.flaticon.com/512/1903/1903162.png',
      conditionFnId: 'episodes_5',
    }
  ];

  for (const b of badges) {
    await prisma.badge.upsert({
      where: { id: b.id },
      update: b,
      create: b,
    });
    console.log(`[SEED] Created badge: ${b.name}`);
  }

  console.log('--- Seed Completed! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
