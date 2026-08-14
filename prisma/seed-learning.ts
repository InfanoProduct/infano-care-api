import { PrismaClient, ContentTier } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Learning Journeys and Episodes...');

  // Clear existing journeys and episodes
  await prisma.reflection.deleteMany({});
  await prisma.userProgress.deleteMany({});
  await prisma.episode.deleteMany({});
  await prisma.learningJourney.deleteMany({});

  // ─── JOURNEY 1: Growing Up & Puberty ────────────────────────────────────────
  const journey1 = await prisma.learningJourney.create({
    data: {
      title: 'Growing Up: The Body & Growth Mystery',
      slug: 'growing-up-body-growth',
      description: 'Discover why puberty happens at different times for everyone, how hormones work, and how to embrace every physical change with confidence.',
      ageBand: '10-14',
      category: 'Body & Growth',
      topics: ['Puberty', 'Hormones', 'Growth', 'Body Positivity'],
      goals: ['Understand physical changes', 'Build body confidence', 'Dispel growing-up anxiety'],
      tags: ['puberty', 'wellness', 'growth', 'beginner'],
      contentTone: 'empowering',
      minContentTier: ContentTier.TEEN_EARLY,
      totalXP: 250,
      isActive: true,
      isPremium: false,
      bannerImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=400&q=80',
      episodes: {
        create: [
          {
            order: 0,
            title: 'The Growth Spurt Mystery',
            slug: 'growth-spurt-mystery',
            description: 'Why is your best friend suddenly taller than you? Uncover how growth timelines work and why every body has its own perfect rhythm.',
            points: 75,
            isPremium: false,
            isActive: true,
            thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
            content: {
              hook: {
                narrativeTexts: [
                  "Meera just grew 4 centimeters in three months.\nHer best friend Nadia hasn’t changed in eight.",
                  "Same age. Same grade. Same life… so why does it feel like they're on completely different paths?",
                  "Is something wrong with Meera? Or is Nadia falling behind?\nOr… is there something no one ever explained about growing up?",
                  "What if puberty doesn’t follow one strict timeline but many?",
                  "In this story, you’ll uncover what’s really happening inside your body, why changes feel sudden, and why comparing yourself is the biggest mistake."
                ]
              },
              story: {
                slides: [
                  {
                    title: "The Growth Engine Inside You",
                    body: "During puberty, your brain sends signals to produce hormones like estrogen and growth hormone. These hormones act like conductors in an orchestra, signaling your bones to grow longer and stronger.",
                    emoji: "🌱"
                  },
                  {
                    title: "Different Timelines, Equal Health",
                    body: "Some girls start their growth spurt as early as age 9, while others begin at 13 or 14. Genetics, nutrition, and personal biology determine your timeline.",
                    emoji: "⏱️"
                  },
                  {
                    title: "Embracing Your Unique Pace",
                    body: "Being early or late to a growth spurt has zero reflection on your health or beauty. Your body knows exactly what it is doing!",
                    emoji: "💖"
                  }
                ]
              },
              quiz: {
                questions: [
                  {
                    question: "True or False: Everyone enters puberty at the exact same age.",
                    options: ["True", "False"],
                    correctIndex: 1,
                    explanation: "False! Everyone has a unique biological timeline ranging anywhere between ages 8 and 14."
                  },
                  {
                    question: "What primary chemical messengers trigger growth during puberty?",
                    options: ["Hormones", "Enzymes", "Vitamins", "Oxygen"],
                    correctIndex: 0,
                    explanation: "Hormones like estrogen and growth hormone act as chemical messengers telling your body to grow."
                  }
                ]
              },
              reflection: {
                prompt: "What is one physical change or growth milestone that made you feel curious or self-conscious recently?",
                suggestedTags: ["Body Confidence", "Growth", "Patience"]
              },
              summary: {
                takeaways: [
                  "Puberty happens on a personal biological timeline, not a shared schedule.",
                  "Growth spurts are triggered by natural hormone signals.",
                  "Comparing your growth rate to friends is unnecessary — your body is right on track!"
                ]
              }
            }
          },
          {
            order: 1,
            title: 'Hormones 101: What Happens Inside',
            slug: 'hormones-101',
            description: 'Learn what estrogen and progesterone do, why mood swings happen, and how to support your body during hormonal shifts.',
            points: 75,
            isPremium: false,
            isActive: true,
            thumbnailUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80',
            content: {
              hook: {
                narrativeTexts: [
                  "One morning you feel super energized and ready to take on the world.",
                  "By evening, a small comment makes you want to lock your door and cry.",
                  "Are you crazy? Absolutely not. Meet your body's chemical messengers: Hormones!",
                  "Let's dive inside and see how estrogen and progesterone guide your feelings and energy."
                ]
              },
              story: {
                slides: [
                  {
                    title: "Meet Estrogen & Progesterone",
                    body: "Estrogen is your energy booster, building up confidence and strength. Progesterone is the calming hormone, preparing your body for rest and reflection.",
                    emoji: "🔬"
                  },
                  {
                    title: "Why Mood Swings Happen",
                    body: "As hormone levels fluctuate throughout the month, your brain chemistry adjusts. Mood shifts are a 100% natural response to these chemical shifts.",
                    emoji: "🌊"
                  }
                ]
              },
              quiz: {
                questions: [
                  {
                    question: "Which hormone is associated with building energy and skin glow?",
                    options: ["Estrogen", "Melatonin", "Insulin"],
                    correctIndex: 0,
                    explanation: "Estrogen rises in the first half of your cycle, boosting energy and focus."
                  }
                ]
              },
              reflection: {
                prompt: "How do you usually soothe yourself when you feel an unexpected mood shift?",
                suggestedTags: ["Self-Care", "Hormones", "Mood Shift"]
              },
              summary: {
                takeaways: [
                  "Hormones are natural chemical signals that influence both energy and mood.",
                  "Estrogen and progesterone work together to orchestrate your monthly rhythm.",
                  "Be gentle with yourself when experiencing emotional shifts!"
                ]
              }
            }
          },
          {
            order: 2,
            title: 'Body Confidence & Navigating Change',
            slug: 'body-confidence-nav',
            description: 'Practical tips to practice body neutral thinking, handle peer comments, and celebrate your unique self.',
            points: 100,
            isPremium: false,
            isActive: true,
            thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80',
            content: {
              hook: {
                narrativeTexts: [
                  "Mirror check: what do you see first when you look at yourself?",
                  "Society tries to tell us how we should look, but your body is your home.",
                  "Let's learn how to shift from self-criticism to body appreciation and resilience."
                ]
              },
              story: {
                slides: [
                  {
                    title: "What is Body Neutrality?",
                    body: "Body neutrality means respecting what your body DOES for you — running, breathing, laughing — rather than judging how it looks.",
                    emoji: "👑"
                  }
                ]
              },
              quiz: {
                questions: [
                  {
                    question: "What is the core principle of body neutrality?",
                    options: ["Appreciating what your body does for you", "Always dressing in trendy clothes", "Comparing yourself to influencers"],
                    correctIndex: 0,
                    explanation: "Body neutrality focuses on function, strength, and self-respect over external appearance."
                  }
                ]
              },
              reflection: {
                prompt: "Write down 3 amazing things your body allowed you to do today.",
                suggestedTags: ["Body Gratitude", "Confidence"]
              },
              summary: {
                takeaways: [
                  "Your body's value lies in its capability, health, and vitality.",
                  "Practice replacing self-critical thoughts with neutral, appreciative affirmations."
                ]
              }
            }
          }
        ]
      }
    }
  });

  // ─── JOURNEY 2: Period Care & Cycle Mastery ──────────────────────────────────
  const journey2 = await prisma.learningJourney.create({
    data: {
      title: 'Period Care & Cycle Mastery',
      slug: 'period-care-cycle-mastery',
      description: 'Master your menstrual cycle from period survival essentials to understanding all 4 phases (Follicular, Ovulatory, Luteal, Menstrual).',
      ageBand: '12-16',
      category: 'Cycle Health',
      topics: ['Period Prep', 'Menstrual Hygiene', 'Cycle Phases', 'Cramp Relief'],
      goals: ['Master period preparation', 'Learn cycle phase tracking', 'Relieve cramps naturally'],
      tags: ['periods', 'cycle', 'hygiene', 'health'],
      contentTone: 'informative',
      minContentTier: ContentTier.TEEN_EARLY,
      totalXP: 300,
      isActive: true,
      isPremium: false,
      bannerImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=400&q=80',
      episodes: {
        create: [
          {
            order: 0,
            title: 'Your First Period Survival Kit',
            slug: 'first-period-survival-kit',
            description: 'Everything you need in your backpack to stay prepared, confident, and stress-free at school or on the go.',
            points: 100,
            isPremium: false,
            isActive: true,
            thumbnailUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
            content: {
              hook: {
                narrativeTexts: [
                  "You're in school during 3rd period math class.",
                  "Suddenly you feel a warm sensation. Is it your period?",
                  "Don't panic! With a tiny emergency kit in your bag, you're 100% covered."
                ]
              },
              story: {
                slides: [
                  {
                    title: "The 4 Emergency Essentials",
                    body: "1. Pads/Panty liners\n2. Spare underwear\n3. Wipes or tissue\n4. Small discreet zip pouch",
                    emoji: "🎒"
                  },
                  {
                    title: "How to Ask a Friend or Nurse",
                    body: "Remember: almost half the world gets periods! Asking a teacher, school nurse, or friend for a pad is normal and nothing to feel awkward about.",
                    emoji: "🤝"
                  }
                ]
              },
              quiz: {
                questions: [
                  {
                    question: "How often should you ideally change a menstrual pad?",
                    options: ["Every 3-4 hours", "Once every 24 hours", "Only when full"],
                    correctIndex: 0,
                    explanation: "Changing your pad every 3-4 hours prevents leakages and maintains hygiene."
                  }
                ]
              },
              reflection: {
                prompt: "Do you have a period pouch ready in your bag? What item will you add to feel prepared?",
                suggestedTags: ["Preparedness", "Period Care"]
              },
              summary: {
                takeaways: [
                  "A pouch with pads and extra underwear keeps you stress-free.",
                  "Periods are natural — never hesitate to ask a nurse or friend for help!"
                ]
              }
            }
          },
          {
            order: 1,
            title: 'Decoding the 4 Cycle Phases',
            slug: 'decoding-4-phases',
            description: 'Understand Menstrual, Follicular, Ovulatory, and Luteal phases to sync your workout, energy, and study schedule.',
            points: 100,
            isPremium: false,
            isActive: true,
            thumbnailUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80',
            content: {
              hook: {
                narrativeTexts: [
                  "Did you know your cycle has 4 distinct seasons?",
                  "Winter (Menstrual), Spring (Follicular), Summer (Ovulatory), and Autumn (Luteal).",
                  "Let's learn how to unlock your super-powers in each phase!"
                ]
              },
              story: {
                slides: [
                  {
                    title: "Phase 1: Menstrual (Winter)",
                    body: "Lower hormone levels mean your body craves rest, warmth, and cozy self-care.",
                    emoji: "❄️"
                  },
                  {
                    title: "Phase 2: Follicular (Spring)",
                    body: "Estrogen rises! Energy surges, social stamina peaks, and brain power is high.",
                    emoji: "🌸"
                  }
                ]
              },
              quiz: {
                questions: [
                  {
                    question: "Which phase brings rising estrogen and high social energy?",
                    options: ["Follicular Phase", "Luteal Phase", "Menstrual Phase"],
                    correctIndex: 0,
                    explanation: "The Follicular phase (Spring) brings fresh energy and high motivation!"
                  }
                ]
              },
              reflection: {
                prompt: "Which phase of your cycle do you feel most aligned with right now?",
                suggestedTags: ["Cycle Syncing", "Seasons"]
              },
              summary: {
                takeaways: [
                  "The 4 phases guide energy, mood, and physical stamina.",
                  "Syncing activities with your cycle helps avoid burnout."
                ]
              }
            }
          }
        ]
      }
    }
  });

  // ─── JOURNEY 3: Emotions, Mindset & Self-Care ────────────────────────────────
  const journey3 = await prisma.learningJourney.create({
    data: {
      title: 'Emotions, Mindset & Self-Care',
      slug: 'emotions-mindset-selfcare',
      description: 'Build mental resilience, practice daily self-compassion, and navigate stress during school and growing-up challenges.',
      ageBand: 'All',
      category: 'Mental Wellbeing',
      topics: ['Mindfulness', 'Stress Relief', 'Self Care', 'Emotional Health'],
      goals: ['Reduce school stress', 'Practice self-compassion', 'Manage anxiety'],
      tags: ['mental-health', 'mindfulness', 'self-care'],
      contentTone: 'calming',
      minContentTier: ContentTier.TEEN_EARLY,
      totalXP: 200,
      isActive: true,
      isPremium: false,
      bannerImage: 'https://images.unsplash.com/photo-1499209974431-9dac3ada00d7?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1499209974431-9dac3ada00d7?auto=format&fit=crop&w=400&q=80',
      episodes: {
        create: [
          {
            order: 0,
            title: 'Riding the Emotional Rollercoaster',
            slug: 'emotional-rollercoaster',
            description: 'Why feelings hit hard sometimes and how to pause, breathe, and reset when overwhelmed.',
            points: 100,
            isPremium: false,
            isActive: true,
            thumbnailUrl: 'https://images.unsplash.com/photo-1499209974431-9dac3ada00d7?auto=format&fit=crop&w=400&q=80',
            content: {
              hook: {
                narrativeTexts: [
                  "Ever feel like an emotional storm rolled in out of nowhere?",
                  "One moment you're happy, the next you're frustrated.",
                  "Emotions are like ocean waves — you can't stop them, but you can learn to surf them!"
                ]
              },
              story: {
                slides: [
                  {
                    title: "The 4-Second Box Breathing Technique",
                    body: "Breathe in for 4s, hold for 4s, exhale for 4s, hold for 4s. This instantly resets your nervous system.",
                    emoji: "🫁"
                  }
                ]
              },
              quiz: {
                questions: [
                  {
                    question: "How does Box Breathing help your body during emotional stress?",
                    options: ["It activates the calming parasympathetic nervous system", "It increases caffeine levels", "It causes adrenaline spikes"],
                    correctIndex: 0,
                    explanation: "Deep rhythmic breathing signals your brain that you are safe, reducing anxiety."
                  }
                ]
              },
              reflection: {
                prompt: "Try 3 cycles of Box Breathing right now. How does your body feel before vs after?",
                suggestedTags: ["Mindfulness", "Breathing", "Calm"]
              },
              summary: {
                takeaways: [
                  "Emotions are temporary waves that pass through your body.",
                  "Box breathing (4-4-4-4) is a super tool for instant calm."
                ]
              }
            }
          }
        ]
      }
    }
  });

  console.log(`✅ Seeding Complete!`);
  console.log(`Created 3 Journeys:`);
  console.log(` - ${journey1.title} (${journey1.slug})`);
  console.log(` - ${journey2.title} (${journey2.slug})`);
  console.log(` - ${journey3.title} (${journey3.slug})`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
