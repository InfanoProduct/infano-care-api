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
          type: "cinematic",
          text: "Meera is in class and she feels it — a warm trickle. Her period has started. She has 3 hours until lunch. But this time, she isn't panicking. She's ready. This is where her story begins."
        },
        story: {
          pages: [
            "assets/images/book/page1.png",
            "assets/images/book/page2.png",
            "assets/images/book/page3.png",
            "assets/images/book/page4.png",
            "assets/images/book/page5.png",
            "assets/images/book/page6.png",
            "assets/images/book/page7.png"
          ]
        },
        knowledgeCheck: {
          questions: [
            {
              question: "Which of the following best describes puberty?",
              options: [
                "It starts at the same age for everyone.",
                "It begins only after age 12.",
                "It happens within a wide age range, unique to each person.",
                "It depends only on lifestyle choices"
              ],
              correctIndex: 2,
              feedback: "Puberty is a range (8–16), not a fixed timeline."
            },
            {
              question: "Meera starts noticing body changes at 12, while her friend hasn’t yet. What is the most accurate interpretation?",
              options: [
                "Meera is developing too early",
                "Her friend is developing too late",
                "One of them may have a health issue",
                "They are on different but normal timelines"
              ],
              correctIndex: 3,
              feedback: "Different timelines = normal variation."
            },
            {
              question: "Meera feels overwhelmed by these changes. According to the story, what is the best way to handle this?",
              options: [
                "Ignore the feeling until it goes away",
                "Acknowledge it and talk to a trusted person",
                "Keep it a secret to avoid embarrassment",
                "Compare yourself to others to see if it's normal"
              ],
              correctIndex: 1,
              feedback: "Sharing your journey makes it less confusing."
            },
            {
              question: "True or False: Most physical growth and repair happens while you are wide awake and active.",
              options: ["True", "False"],
              correctIndex: 1,
              feedback: "Sleep is when your body does its heavy lifting/growth!"
            },
            {
              question: "Meera sees a social media post of a girl who looks 'perfect.' How should she process this?",
              options: [
                "Filters and lighting create unrealistic standards",
                "She should try to look exactly like that",
                "Everyone else is developing faster than her",
                "She is doing something wrong"
              ],
              correctIndex: 0,
              feedback: "Pixel-perfect isn't real life."
            },
            {
              question: "At the end of the day, Meera looks in the mirror. What is her most important realization?",
              options: [
                "Change is scary and bad",
                "She needs to change her style",
                "Her body is unique and on its own perfect clock",
                "Puberty ends very quickly"
              ],
              correctIndex: 2,
              feedback: "Acceptance is your greatest superpower."
            }
          ]
        },
        reflectionJournal: {
          sections: [
            {
              id: "notice",
              type: "text",
              prompt: "Think about a moment recently when you noticed a change in your body… and it confused you.",
              hint: "It could be anything—height, skin, feelings, energy, or something you didn’t expect."
            },
            {
              id: "feelings",
              type: "emotion-chips",
              prompt: "How did that moment make you feel?",
              options: ["Confused", "Worried", "Embarrassed", "Curious", "Neutral", "Something else"]
            },
            {
              id: "comparison",
              type: "choice-conditional",
              prompt: "Were you comparing yourself to someone in that moment?",
              options: ["Yes", "No", "Not sure"],
              followUp: {
                trigger: "Yes",
                prompt: "Who were you comparing yourself to? And what felt different?",
                hint: "Maybe a friend, a sibling, or someone online?"
              }
            },
            {
              id: "reframe",
              type: "text",
              prompt: "If you could go back to that moment, what would you tell yourself?",
              hint: "Example: 'It’s okay to be different,' or 'I’m not late, I’m just me.'"
            },
            {
              id: "affirmation",
              type: "completion",
              prompt: "Complete this sentence: My body is not late or early. It is...",
              hint: "e.g., 'Exactly where it needs to be', 'Growing in its own way'"
            }
          ]
        },
        summary: {
          text: "You've taken a huge step today. Understanding your timeline is the first key to owning your story. Remember: your body is on your side!"
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
