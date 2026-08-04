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
        content: "Your body is working hard right now. This is a natural time for rest and inward reflection. Don't feel guilty about taking it slow.",
      },
      {
        order: 1,
        title: 'Hydration is Key',
        content: 'Drinking warm water can help soothe cramps and keep you hydrated. Add a slice of ginger for extra comfort.',
      },
    ],
  },
  {
    phase: 'menstrual',
    previewTitle: 'Cramp Relief',
    previewEmoji: '🧘‍♀️',
    previewColorHex: '#EC4899',
    sortOrder: 1,
    stories: [
      {
        order: 0,
        title: 'Gentle Movement',
        content: "Gentle stretches like child's pose and cat-cow can relieve uterine tension. Keep breathing deeply to oxygenate your muscles.",
      },
      {
        order: 1,
        title: 'Heat Therapy',
        content: 'A warm bath or heating pad on your lower back/abdomen works wonders by increasing blood flow and relaxing muscles.',
      },
    ],
  },
  {
    phase: 'menstrual',
    previewTitle: 'Cycle Nutrition',
    previewEmoji: '🥩',
    previewColorHex: '#DB2777',
    sortOrder: 2,
    stories: [
      {
        order: 0,
        title: 'Replenishing Iron',
        content: 'Since you are losing blood, focus on iron-rich foods like spinach, lentils, pumpkin seeds, and lean red meats.',
      },
      {
        order: 1,
        title: 'Magnesium Boost',
        content: 'Dark chocolate is high in magnesium, which can help relax uterine muscles and reduce painful cramping.',
      },
    ],
  },
  {
    phase: 'menstrual',
    previewTitle: 'Restful Sleep',
    previewEmoji: '🌙',
    previewColorHex: '#BE185D',
    sortOrder: 3,
    stories: [
      {
        order: 0,
        title: 'Sleep Quality',
        content: 'Progesterone drop during menstruation might affect sleep. Aim for 8 hours in a cool, quiet, and dark room.',
      },
      {
        order: 1,
        title: 'Wind-Down Rituals',
        content: 'Turn off screens 1 hour before bed. A warm cup of chamomile tea helps prepare your mind for deep, restorative sleep.',
      },
    ],
  },
  {
    phase: 'menstrual',
    previewTitle: 'Hormone Check',
    previewEmoji: '🧬',
    previewColorHex: '#9D174D',
    sortOrder: 4,
    stories: [
      {
        order: 0,
        title: 'Estrogen Reset',
        content: 'Both estrogen and progesterone are at their lowest right now. Your energy levels are naturally low; accept and honor it.',
      },
      {
        order: 1,
        title: 'Slow & Steady',
        content: 'Listen to your body. Do not push yourself too hard at work or workouts. Rest is an essential part of progress.',
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
        content: 'You are entering your follicular phase! Estrogen is rising, which means you might experience a surge in energy and creativity today.',
      },
      {
        order: 1,
        title: 'Movement Tip',
        content: "It's a great day for a high-intensity workout. Try a new class or go for a run. Your body is primed for action.",
      },
    ],
  },
  {
    phase: 'follicular',
    previewTitle: 'Focus & Drive',
    previewEmoji: '🧠',
    previewColorHex: '#CA8A04',
    sortOrder: 1,
    stories: [
      {
        order: 0,
        title: 'Cognitive Surge',
        content: 'Higher estrogen levels boost verbal fluency, memory, and spatial ability. Pitch new ideas or solve complex problems today!',
      },
      {
        order: 1,
        title: 'Task Management',
        content: 'Tackle your most demanding tasks or learn a new skill. Your brain is highly receptive and focused right now.',
      },
    ],
  },
  {
    phase: 'follicular',
    previewTitle: 'Social Spark',
    previewEmoji: '👋',
    previewColorHex: '#B45309',
    sortOrder: 2,
    stories: [
      {
        order: 0,
        title: 'Outward Focus',
        content: "You'll likely feel more extroverted and willing to socialize. Reconnect with old friends or organize a gathering.",
      },
      {
        order: 1,
        title: 'New Connections',
        content: 'Networking is smoother in this phase. Your empathy and verbal processing are naturally elevated.',
      },
    ],
  },
  {
    phase: 'follicular',
    previewTitle: 'Strength Phase',
    previewEmoji: '🏋️‍♀️',
    previewColorHex: '#854D0E',
    sortOrder: 3,
    stories: [
      {
        order: 0,
        title: 'Build Muscle',
        content: 'Your body is more efficient at using carbs for fuel. It is the perfect phase to build strength and lift weights.',
      },
      {
        order: 1,
        title: 'Recovery Speed',
        content: 'You recover faster from heavy physical training now. Challenge yourself with progressive resistance workouts.',
      },
    ],
  },
  {
    phase: 'follicular',
    previewTitle: 'Skin & Estrogen',
    previewEmoji: '✨',
    previewColorHex: '#F59E0B',
    sortOrder: 4,
    stories: [
      {
        order: 0,
        title: 'Natural Glow',
        content: 'Rising estrogen boosts collagen production and skin moisture. Enjoy your clear, bright skin today!',
      },
      {
        order: 1,
        title: 'Hydration Focus',
        content: 'Lock in that moisture. Keep up a basic hydrating skincare routine to maintain this phase\'s natural glow.',
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
        title: 'Social Peak',
        content: "Your social confidence is likely at its peak. It's a perfect time for presentations, dates, or meeting new people!",
      },
      {
        order: 1,
        title: 'Confidence Boost',
        content: 'Hormones make you feel attractive and vibrant. Use this confidence boost to voice your thoughts and shine.',
      },
    ],
  },
  {
    phase: 'ovulation',
    previewTitle: 'Fertile Window',
    previewEmoji: '🥚',
    previewColorHex: '#7C3AED',
    sortOrder: 1,
    stories: [
      {
        order: 0,
        title: 'The Egg Release',
        content: 'An egg is released from the ovary and lives for about 12-24 hours. Understand your fertility signs to stay in control.',
      },
      {
        order: 1,
        title: 'Cervical Fluid',
        content: 'You might notice clear, stretchy discharge like raw egg whites. This supports sperm health and ease of mobility.',
      },
    ],
  },
  {
    phase: 'ovulation',
    previewTitle: 'Pitch Perfect',
    previewEmoji: '🗣️',
    previewColorHex: '#6D28D9',
    sortOrder: 2,
    stories: [
      {
        order: 0,
        title: 'Verbal Expression',
        content: 'Testosterone and estrogen peak together, enhancing your charisma, articulation, and verbal speed.',
      },
      {
        order: 1,
        title: 'Negotiation Power',
        content: 'If you need to make a request or negotiate, today is the day. Your negotiation and persuasion skills are high.',
      },
    ],
  },
  {
    phase: 'ovulation',
    previewTitle: 'Ovulation Fuel',
    previewEmoji: '🥗',
    previewColorHex: '#5B21B6',
    sortOrder: 3,
    stories: [
      {
        order: 0,
        title: 'High Energy Use',
        content: "Your body's resting metabolic rate rises slightly during ovulation. Feed your body nourishing, anti-inflammatory whole foods.",
      },
      {
        order: 1,
        title: 'Avoid Fasting',
        content: 'Avoid extreme fasting right now. Your body needs stable fuel to support the massive ovulation hormone surge.',
      },
    ],
  },
  {
    phase: 'ovulation',
    previewTitle: 'Mittelschmerz',
    previewEmoji: '⚡',
    previewColorHex: '#4C1D95',
    sortOrder: 4,
    stories: [
      {
        order: 0,
        title: 'One-Sided Pinch',
        content: 'You might feel a mild twinge or pinch on one side of your lower abdomen. This is normal ovulation pain (mittelschmerz).',
      },
      {
        order: 1,
        title: 'Nurturing Body',
        content: 'If it feels uncomfortable, take warm herbal tea and do light walking or stretching to soothe pelvic muscles.',
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
        content: 'As progesterone rises, you might feel more sensitive. Be extra kind to yourself today.',
      },
      {
        order: 1,
        title: 'Nesting Instinct',
        content: 'You might prefer a quiet evening at home. Use this time to tidy your space, journal, and relax.',
      },
    ],
  },
  {
    phase: 'luteal',
    previewTitle: 'PMS Management',
    previewEmoji: '🧘',
    previewColorHex: '#4F46E5',
    sortOrder: 1,
    stories: [
      {
        order: 0,
        title: 'Mood Shifts',
        content: 'The drop in estrogen can trigger irritability or mood swings. Remind yourself: this is a natural chemical shift.',
      },
      {
        order: 1,
        title: 'Grounding Exercises',
        content: 'Use deep box breathing (4s in, 4s hold, 4s out, 4s hold) to instantly calm your nervous system and reduce stress.',
      },
    ],
  },
  {
    phase: 'luteal',
    previewTitle: 'Curious Cravings',
    previewEmoji: '🍫',
    previewColorHex: '#4338CA',
    sortOrder: 2,
    stories: [
      {
        order: 0,
        title: 'Calorie Needs',
        content: "Your body's resting metabolism increases. You naturally need about 100-300 extra calories a day during this phase.",
      },
      {
        order: 1,
        title: 'Smart Snacks',
        content: 'Satisfy cravings with complex carbs and protein (e.g. apple slices with peanut butter or a bit of dark chocolate).',
      },
    ],
  },
  {
    phase: 'luteal',
    previewTitle: 'Oil & Breakouts',
    previewEmoji: '🧼',
    previewColorHex: '#3730A3',
    sortOrder: 3,
    stories: [
      {
        order: 0,
        title: 'Progesterone Rise',
        content: 'Rising progesterone stimulates sebum (oil) production, which can clog pores. PMS breakouts are very common.',
      },
      {
        order: 1,
        title: 'Clean & Soothe',
        content: 'Use a gentle salicylic acid cleanser, stay hydrated, and avoid touching your face to prevent irritation.',
      },
    ],
  },
  {
    phase: 'luteal',
    previewTitle: 'Restorative Move',
    previewEmoji: '🚶‍♀️',
    previewColorHex: '#312E81',
    sortOrder: 4,
    stories: [
      {
        order: 0,
        title: 'Low Impact Workouts',
        content: 'Shift from intense cardio to yoga, Pilates, or leisure walking to keep cortisol levels low.',
      },
      {
        order: 1,
        title: 'Listen to Fatigue',
        content: 'If you feel exhausted, skip the gym. Restorative, gentle movement is much better for hormone balance right now.',
      },
    ],
  },
  // ── Waiting ────────────────────────────────────────────────────────────────
  {
    phase: 'waiting',
    previewTitle: 'Welcome to Infano',
    previewEmoji: '🌸',
    previewColorHex: '#A855F7',
    sortOrder: 0,
    stories: [
      {
        order: 0,
        title: 'Track with Ease',
        content: 'Welcome! Infano helps you understand your body\'s natural rhythms. Log daily to get started.',
      },
      {
        order: 1,
        title: 'Explore Gigi',
        content: 'Tap the chat widget to ask Gigi any questions about puberty, cycle shifts, or self-care tips.',
      },
    ],
  },
  {
    phase: 'waiting',
    previewTitle: 'Start Tracking',
    previewEmoji: '📝',
    previewColorHex: '#EC4899',
    sortOrder: 1,
    stories: [
      {
        order: 0,
        title: 'Logging is Simple',
        content: 'Simply tap the \'+\' or \'Log Today\' button to record your symptoms, moods, sleep, and energy.',
      },
      {
        order: 1,
        title: 'Prediction Engine',
        content: 'Once you log your first period, our AI engine will predict your upcoming cycle phases.',
      },
    ],
  },
  {
    phase: 'waiting',
    previewTitle: 'Cycle Basics',
    previewEmoji: '📊',
    previewColorHex: '#3B82F6',
    sortOrder: 2,
    stories: [
      {
        order: 0,
        title: 'The 4 Phases',
        content: 'Your cycle consists of Menstrual, Follicular, Ovulation, and Luteal phases. Each has unique energy levels.',
      },
      {
        order: 1,
        title: 'Track Your Unique Pattern',
        content: 'No two cycles are identical. Daily logging helps build your customized health profile.',
      },
    ],
  },
  {
    phase: 'waiting',
    previewTitle: 'Body Language',
    previewEmoji: '🌱',
    previewColorHex: '#10B981',
    sortOrder: 3,
    stories: [
      {
        order: 0,
        title: 'Listen Closely',
        content: 'Notice shifts in energy, sleep quality, and moods. These are indicators of your hormonal health.',
      },
      {
        order: 1,
        title: 'Daily Reflection',
        content: 'Taking 1 minute daily to check in with yourself is a powerful practice of mindfulness.',
      },
    ],
  },
  {
    phase: 'waiting',
    previewTitle: 'Support System',
    previewEmoji: '👭',
    previewColorHex: '#F59E0B',
    sortOrder: 4,
    stories: [
      {
        order: 0,
        title: 'You Are Not Alone',
        content: 'Connect with other peers or reach out to our vetted expert mentors in the app.',
      },
      {
        order: 1,
        title: 'Ask an Expert',
        content: 'Navigate to the Consultations tab if you need expert medical or psychological guidance.',
      },
    ],
  },
  // ── Delayed ────────────────────────────────────────────────────────────────
  {
    phase: 'delayed',
    previewTitle: 'Delayed Cycles',
    previewEmoji: '⏰',
    previewColorHex: '#EF4444',
    sortOrder: 0,
    stories: [
      {
        order: 0,
        title: 'Is my period late?',
        content: 'It is totally normal for a period to be late, especially during adolescence as your body is still adjusting to hormone variations.',
      },
      {
        order: 1,
        title: 'Typical Causes',
        content: 'Stress, diet changes, physical exercise, or sleep shifts can all temporarily delay ovulation, pushing back your period date.',
      },
    ],
  },
  {
    phase: 'delayed',
    previewTitle: 'Stress Factor',
    previewEmoji: '💆‍♀️',
    previewColorHex: '#F59E0B',
    sortOrder: 1,
    stories: [
      {
        order: 0,
        title: 'Brain-Hormone Loop',
        content: 'High stress releases cortisol, which tells your brain to put reproduction on hold. This can delay your period.',
      },
      {
        order: 1,
        title: 'Calming Rituals',
        content: 'Try to incorporate simple grounding exercises, deep breathing, or journaling to help signal safety to your body.',
      },
    ],
  },
  {
    phase: 'delayed',
    previewTitle: 'Record Symptoms',
    previewEmoji: '📝',
    previewColorHex: '#A855F7',
    sortOrder: 2,
    stories: [
      {
        order: 0,
        title: 'Observe Body Signs',
        content: 'Log any symptoms you feel today—like mild cramps, bloating, or mood changes. These are signs your cycle is active.',
      },
      {
        order: 1,
        title: 'Spotting vs. Flow',
        content: 'Spotting is very light pink/brown drop-like bleeding, whereas period flow is active red bleeding. Log flow once it actively starts!',
      },
    ],
  },
  {
    phase: 'delayed',
    previewTitle: 'Supportive Steps',
    previewEmoji: '🥑',
    previewColorHex: '#10B981',
    sortOrder: 3,
    stories: [
      {
        order: 0,
        title: 'Nourish Your Body',
        content: 'Eat whole, nourishing foods like healthy fats (avocados, nuts) and complex carbs. Avoid skipping meals, which can stress your cycle.',
      },
      {
        order: 1,
        title: 'Rest and Recover',
        content: 'Prioritize 8-9 hours of restful sleep. Sleep is when your body restores hormone balances and lowers general cortisol.',
      },
    ],
  },
  {
    phase: 'delayed',
    previewTitle: 'When to Consult',
    previewEmoji: '👩‍⚕️',
    previewColorHex: '#3B82F6',
    sortOrder: 4,
    stories: [
      {
        order: 0,
        title: 'Keep Tracking',
        content: 'We recommend tracking for 3 consecutive months to identify your body\'s baseline and variation patterns.',
      },
      {
        order: 1,
        title: 'Expert Help',
        content: 'If your period is delayed by more than 90 days, or you have severe pain, connect with our care team on the Consultations tab.',
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
  { phase: 'waiting', title: 'What is puberty?', readTime: '5 min read', emoji: '👧', sortOrder: 1 },
  { phase: 'waiting', title: 'Getting ready for your first period', readTime: '6 min read', emoji: '🎒', sortOrder: 2 },
  { phase: 'waiting', title: 'How to track with Infano', readTime: '3 min read', emoji: '📱', sortOrder: 3 },
  // Delayed
  { phase: 'delayed', title: 'Why is my period late? Common causes explained', readTime: '5 min read', emoji: '⏰', sortOrder: 0 },
  { phase: 'delayed', title: 'How stress impacts your cycle rhythm', readTime: '4 min read', emoji: '🧠', sortOrder: 1 },
  { phase: 'delayed', title: 'Nutritious foods to naturally support your cycle', readTime: '6 min read', emoji: '🥗', sortOrder: 2 },
];

async function main() {
  console.log('🌱 Clearing existing tracker content...');
  await prisma.trackerStory.deleteMany();
  await prisma.trackerInsight.deleteMany();
  await prisma.trackerArticle.deleteMany();

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
