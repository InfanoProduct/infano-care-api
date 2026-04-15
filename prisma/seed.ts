import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const testNumbers = [
    { phone: '+911234567890', isTestNumber: true, role: 'TEEN', isMentor: false },
    { phone: '+911112223333', isTestNumber: true, role: 'TEEN', isMentor: true }
  ]

  for (const item of testNumbers) {
    const user = await prisma.user.upsert({
      where: { phone: item.phone },
      update: { 
        isTestNumber: item.isTestNumber,
        accountStatus: 'ACTIVE',
        onboardingStep: 13,
        contentTier: 'ADULT',
        birthMonth: 1,
        birthYear: 2005,
        profile: {
          upsert: {
            create: {
              displayName: item.isMentor ? 'Expert Mentor' : 'Test User',
              pronouns: 'they/them',
              totalPoints: 100,
              bloomLevel: 2,
              mentorStatus: item.isMentor ? 'certified' : 'none',
              certifiedTopicIds: item.isMentor ? ['periods-body', 'mind-space'] : []
            },
            update: {
              displayName: item.isMentor ? 'Expert Mentor' : 'Test User',
              mentorStatus: item.isMentor ? 'certified' : 'none',
              certifiedTopicIds: item.isMentor ? ['periods-body', 'mind-space'] : []
            }
          }
        }
      },
      create: {
        phone: item.phone,
        isTestNumber: item.isTestNumber,
        accountStatus: 'ACTIVE',
        onboardingStep: 13,
        contentTier: 'ADULT',
        birthMonth: 1,
        birthYear: 2005,
        profile: {
          create: {
            displayName: item.isMentor ? 'Expert Mentor' : 'Test User',
            pronouns: 'they/them',
            totalPoints: 100,
            bloomLevel: 2,
            mentorStatus: item.isMentor ? 'certified' : 'none',
            certifiedTopicIds: item.isMentor ? ['periods-body', 'mind-space'] : []
          }
        }
      },
    })
    console.log(`Upserted user: ${user.phone}, isTestNumber: ${user.isTestNumber}, isMentor: ${item.isMentor}`)
  }

  // --- Seed Learning Journeys ---
  const journey = await prisma.learningJourney.upsert({
    where: { slug: 'first-period-basics' },
    update: {},
    create: {
      title: 'First Period: The Essentials',
      slug: 'first-period-basics',
      description: 'Everything you need to know about your first period, from products to feelings.',
      ageBand: 'TEEN_EARLY',
      topics: ['puberty', 'period_health'],
      goals: ['confidence', 'body_health'],
      totalXP: 150,
    }
  });

  const episode1 = await prisma.episode.upsert({
    where: { slug: 'welcome-to-the-club' },
    update: {},
    create: {
      journeyId: journey.id,
      title: 'Welcome to the Club',
      slug: 'welcome-to-the-club',
      description: 'Your body is doing something amazing. Let\'s find out why.',
      order: 1,
      points: 50,
      content: {
        hook: {
          type: "A",
          text: "Amara is in class and she feels it — a warm trickle. Her period has started. She has 3 hours until lunch. This is what she does next."
        },
        story: {
          title: "Meera's Discovery",
          text: "Meera was nervous, but she remembered what her mom told her. She reached for her kit and realized she was prepared. 'It's not so bad,' she thought.",
          interactiveMoments: [
            { type: "tap-to-reveal", title: "Wait, what's a kit?", text: "A period kit contains pads, a clean pair of underwear, and maybe a small snack!" }
          ]
        },
        knowledgeCheck: {
          questions: [
            {
              type: "Single-choice",
              question: "What is the first thing Meera did?",
              options: ["Panicked", "Remembered her prep", "Left school", "Cried"],
              correctIndex: 1,
              explanation: "Being prepared helps stay calm!"
            },
            {
              type: "True/False",
              question: "A period kit is only for emergencies?",
              options: ["True", "False"],
              correctIndex: 1,
              explanation: "It's for whenever you need it!"
            },
            {
              type: "Single-choice",
              question: "How did Meera feel at the end?",
              options: ["Scared", "Ready/Empowered", "Tired", "Angry"],
              correctIndex: 1,
              explanation: "Knowledge is power!"
            }
          ]
        },
        reflection: {
          prompt: "What's one thing you'd put in your own period kit?",
          modes: ["private", "community"]
        },
        summary: {
          text: "You're off to a great start! You've learned that being prepared is half the battle."
        }
      }
    }
  });

  console.log(`Upserted Journey: ${journey.title}`);
  console.log(`Upserted Episode: ${episode1.title}`);
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
