import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding episodes for "Understanding Your Emotions" journey...');

  // Ensure journey exists
  const journey = await prisma.learningJourney.upsert({
    where: { slug: 'understanding-emotions' },
    update: {
      description: 'Learn how to identify, understand, and manage your emotions during the teenage years.',
      category: 'Mental Wellness',
      isActive: true,
      totalXP: 500
    },
    create: {
      title: 'Understanding Your Emotions',
      slug: 'understanding-emotions',
      description: 'Learn how to identify, understand, and manage your emotions during the teenage years.',
      category: 'Mental Wellness',
      isActive: true,
      totalXP: 500
    }
  });

  const episodes = [
    {
      order: 2,
      title: 'Episode 2: Naming Your Feelings',
      slug: 'understanding-emotions-ep2-naming-feelings',
      description: 'Learn to label your emotions and calm the storm inside.',
      points: 75,
      content: {
        hook: { text: "Have you ever felt a giant storm inside, but couldn't quite find the right word for it? Is it anger, sadness, or maybe just feeling overwhelmed? Today, we will learn how naming a feeling can actually help calm the storm." },
        story: { pages: [
          "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=500&auto=format&fit=crop"
        ] },
        quiz: { questions: [
          {
            question: "What happens in your brain when you name a strong feeling?",
            options: [
              "It makes the emotion feel even stronger",
              "It helps soothe the emotional center (amygdala)",
              "It does not change anything"
            ],
            correctIndex: 1,
            explanation: "Research shows that 'naming' an emotion triggers the prefrontal cortex, which sends calming signals to the amygdala. Name it to tame it!"
          }
        ] },
        journal: { prompt: "Write about an emotion you felt today, no matter how small. Where in your body did you feel it?" },
        summary: { text: "By labeling our emotions, we take away their power to overwhelm us. Remember: all emotions are welcome, and they all pass." }
      }
    },
    {
      order: 3,
      title: 'Episode 3: Riding the Waves of Anger',
      slug: 'understanding-emotions-ep3-riding-waves',
      description: 'How to handle intense anger without letting it control you.',
      points: 75,
      content: {
        hook: { text: "Anger is like a sudden thunderstorm—intense, loud, and sometimes scary. But just like a storm, it doesn't last forever. Let's learn how to ride the wave without crashing." },
        story: { pages: [
          "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=500&auto=format&fit=crop"
        ] },
        quiz: { questions: [
          {
            question: "Which of the following is a healthy way to process anger?",
            options: [
              "Suppressing it and acting like nothing is wrong",
              "Taking deep breaths and stepping away for a moment",
              "Screaming at someone to release the tension"
            ],
            correctIndex: 1,
            explanation: "Stepping away and taking slow deep breaths activates the parasympathetic nervous system, cooling down your body's fight-or-flight response."
          }
        ] },
        journal: { prompt: "Think of the last time you felt really angry. What triggered it, and what would you try doing next time?" },
        summary: { text: "Anger is a normal human emotion. It's a signal, not a command. You have the power to choose how to respond to it." }
      }
    },
    {
      order: 4,
      title: 'Episode 4: Growing Joy & Gratitude',
      slug: 'understanding-emotions-ep4-joy-gratitude',
      description: 'Focus on small positive things to cultivate daily happiness.',
      points: 75,
      content: {
        hook: { text: "Joy isn't just about the big moments; it's about noticing the small, beautiful details in our everyday life. Let's explore how practicing gratitude can grow our inner joy garden." },
        story: { pages: [
          "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&auto=format&fit=crop"
        ] },
        quiz: { questions: [
          {
            question: "How does practicing gratitude affect your brain?",
            options: [
              "It rewires your brain to notice positive things more easily",
              "It makes you forget all your problems",
              "It has no scientific effect on the brain"
            ],
            correctIndex: 0,
            explanation: "Gratitude practice stimulates dopamine and serotonin release, training your neural pathways to seek out positive patterns in your life."
          }
        ] },
        journal: { prompt: "Write down three small things that you are grateful for today." },
        summary: { text: "Joy is a practice. By choosing to focus on gratitude, we train our brains to see the beauty and support around us." }
      }
    }
  ];

  for (const ep of episodes) {
    await prisma.episode.upsert({
      where: { slug: ep.slug },
      update: {
        journeyId: journey.id,
        order: ep.order,
        title: ep.title,
        description: ep.description,
        points: ep.points,
        content: ep.content as any,
      },
      create: {
        journeyId: journey.id,
        order: ep.order,
        title: ep.title,
        slug: ep.slug,
        description: ep.description,
        points: ep.points,
        content: ep.content as any,
      }
    });
    console.log(`[SEED] Upserted episode: ${ep.title}`);
  }

  console.log('Emotions episodes seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
