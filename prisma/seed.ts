/// <reference types="node" />
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

  // --- New Journey 1: Body Positivity ---
  const journey2 = await prisma.learningJourney.upsert({
    where: { slug: 'body-positivity-and-you' },
    update: {},
    create: {
      title: 'Body Positivity & You',
      slug: 'body-positivity-and-you',
      description: 'Embracing your changing body and learning to love yourself exactly as you are.',
      ageBand: 'TEEN_EARLY',
      topics: ['body_image', 'self_love'],
      goals: ['confidence', 'mental_health'],
      totalXP: 200,
      isPremium: true,
    }
  });

  const j2_episode1 = await prisma.episode.upsert({
    where: { slug: 'mirror-mirror' },
    update: {},
    create: {
      journeyId: journey2.id,
      title: 'Mirror, Mirror',
      slug: 'mirror-mirror',
      description: 'Understanding why we compare ourselves and how to stop the cycle.',
      order: 1,
      points: 100,
      content: {
        hook: {
          type: "cinematic",
          text: "Sara stares at the mirror before school, tugging at her shirt. Everything feels wrong today. But what if the mirror isn't showing the full picture?"
        },
        story: {
          pages: [
            "assets/images/book/body1.png",
            "assets/images/book/body2.png"
          ]
        },
        knowledgeCheck: {
          questions: [
            {
              question: "What is the main cause of sudden changes in body shape during puberty?",
              options: ["Diet", "Hormones", "Sleep", "Exercise"],
              correctIndex: 1,
              feedback: "Hormones are the directors of all these changes!"
            }
          ]
        },
        summary: { text: "Your body is an amazing instrument, not an ornament." }
      }
    }
  });

  const j2_episode2 = await prisma.episode.upsert({
    where: { slug: 'social-media-vs-reality' },
    update: {},
    create: {
      journeyId: journey2.id,
      title: 'Social Media vs. Reality',
      slug: 'social-media-vs-reality',
      description: 'Learning to curate your feed for a healthier mindset.',
      order: 2,
      points: 100,
      content: {
        hook: {
          type: "cinematic",
          text: "Scroll, scroll, sigh. Sound familiar? Let's talk about what happens behind the screen."
        },
        knowledgeCheck: {
          questions: [
            {
              question: "True or False: Most influencers use filters and professional lighting.",
              options: ["True", "False"],
              correctIndex: 0,
              feedback: "What you see online is usually a highly edited version of reality."
            }
          ]
        },
        reflectionJournal: {
          sections: [
            {
              id: "feed_cleanse",
              type: "text",
              prompt: "Name one account you follow that makes you feel bad, and one that makes you feel good.",
              hint: "Time for a spring cleaning of your feed!"
            }
          ]
        },
        summary: { text: "You have the power to control your digital environment." }
      }
    }
  });

  // --- New Journey 2: Friendship Dynamics ---
  const journey3 = await prisma.learningJourney.upsert({
    where: { slug: 'navigating-friendships' },
    update: {},
    create: {
      title: 'Navigating Friendships',
      slug: 'navigating-friendships',
      description: 'Understanding changing dynamics, setting boundaries, and being a good friend.',
      ageBand: 'TEEN_EARLY',
      topics: ['friendship', 'boundaries'],
      goals: ['relationships', 'communication'],
      totalXP: 200,
      isPremium: true,
    }
  });

  const j3_episode1 = await prisma.episode.upsert({
    where: { slug: 'shifting-circles' },
    update: {},
    create: {
      journeyId: journey3.id,
      title: 'Shifting Circles',
      slug: 'shifting-circles',
      description: 'Why friendships change during middle and high school.',
      order: 1,
      points: 100,
      content: {
        hook: {
          type: "cinematic",
          text: "Aisha and Chloe have been best friends since kindergarten. Lately, Aisha feels left out. What changed?"
        },
        knowledgeCheck: {
          questions: [
            {
              question: "Is it normal for friend groups to change as you grow up?",
              options: ["Yes, people grow and find new interests.", "No, real friends never change."],
              correctIndex: 0,
              feedback: "Growth means change, and that applies to friendships too."
            }
          ]
        },
        summary: { text: "It's okay to outgrow certain spaces and find new ones." }
      }
    }
  });

  const j3_episode2 = await prisma.episode.upsert({
    where: { slug: 'setting-boundaries' },
    update: {},
    create: {
      journeyId: journey3.id,
      title: 'Setting Boundaries',
      slug: 'setting-boundaries',
      description: 'How to say no without feeling guilty.',
      order: 2,
      points: 100,
      content: {
        hook: {
          type: "cinematic",
          text: "'I really don't want to go, but I can't say no.' How many times have you said this?"
        },
        reflectionJournal: {
          sections: [
            {
              id: "boundaries_check",
              type: "text",
              prompt: "What is one boundary you've wanted to set but haven't?",
              hint: "Maybe asking for alone time, or saying no to sharing clothes."
            }
          ]
        },
        summary: { text: "A boundary is a bridge, not a wall. It helps keep the relationship healthy." }
      }
    }
  });

  // --- New Journey 3: Intro to Skincare ---
  const journey4 = await prisma.learningJourney.upsert({
    where: { slug: 'intro-to-skincare' },
    update: {},
    create: {
      title: 'Intro to Skincare',
      slug: 'intro-to-skincare',
      description: 'Decoding breakouts and building a simple, effective routine for your changing skin.',
      ageBand: 'TEEN_EARLY',
      topics: ['skincare', 'hygiene'],
      goals: ['body_health', 'confidence'],
      totalXP: 200,
      isPremium: true,
    }
  });

  const j4_episode1 = await prisma.episode.upsert({
    where: { slug: 'hormones-and-breakouts' },
    update: {},
    create: {
      journeyId: journey4.id,
      title: 'Hormones and Breakouts',
      slug: 'hormones-and-breakouts',
      description: 'Why you get pimples right before your period.',
      order: 1,
      points: 100,
      content: {
        hook: {
          type: "cinematic",
          text: "You wake up, look in the mirror, and there it is: a giant pimple on your chin. Let's find out why."
        },
        knowledgeCheck: {
          questions: [
            {
              question: "What hormone is primarily responsible for increased oil production?",
              options: ["Estrogen", "Progesterone", "Testosterone"],
              correctIndex: 1,
              feedback: "Progesterone peaks before your period, causing more oil production."
            }
          ]
        },
        summary: { text: "Breakouts are completely normal and biological. Be kind to your skin." }
      }
    }
  });

  const j4_episode2 = await prisma.episode.upsert({
    where: { slug: 'building-a-routine' },
    update: {},
    create: {
      journeyId: journey4.id,
      title: 'Building a Routine',
      slug: 'building-a-routine',
      description: 'The essentials: Cleanse, Moisturize, Protect.',
      order: 2,
      points: 100,
      content: {
        hook: {
          type: "cinematic",
          text: "10-step routines? Too much! Let's strip it down to the basics that actually work."
        },
        knowledgeCheck: {
          questions: [
            {
              question: "What is the most important step in a morning skincare routine?",
              options: ["Toner", "Sunscreen", "Exfoliator"],
              correctIndex: 1,
              feedback: "Sunscreen protects your skin from damage and prevents dark spots!"
            }
          ]
        },
        summary: { text: "Consistency beats complexity. Keep it simple and stick to it." }
      }
    }
  });

  console.log(`Upserted Journey: ${journey.title}`);
  console.log(`Upserted Episode: ${episode1.title}`);
  console.log(`Upserted Journey: ${journey2.title}`);
  console.log(`Upserted Journey: ${journey3.title}`);
  console.log(`Upserted Journey: ${journey4.title}`);
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
