import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BODY_IMAGE_NODES: any[] = [
  {
    nodeId: "bi_story_1",
    type: "story",
    position: "fixed_start",
    title: "Meera and the Mirror (Part 1)",
    estMinutes: 5,
    xpReward: 20,
    content: {
      pages: [
        {
          pageNumber: 1,
          title: "The Morning Mirror",
          image: "assets/images/story/page_1.jpg",
          panels: [
            {
              id: "bi_p1_1",
              description: "The morning began like any other. Meera was late. Again. Pulling on her school uniform, she stood in front of her bedroom mirror. Something looked different. She leaned closer, stepped back, turned sideways.",
              dialogue: [
                { character: "Narrator", type: "thought", text: "Her face seemed a little different. Her body looked different from how she remembered it. Her jeans felt slightly tighter." },
                { character: "Meera", type: "thought", text: "Wait… is that me?" }
              ]
            }
          ]
        },
        {
          pageNumber: 2,
          title: "The Inspection",
          image: "assets/images/story/page_2.jpg",
          panels: [
            {
              id: "bi_p1_2",
              description: "Suddenly, everything seemed worth inspecting. Why did one side look different? Why didn't her clothes fall the way they did before? Why did some girls at school look so grown-up while she still felt like she was figuring everything out?",
              dialogue: [
                { character: "Meera", type: "thought", text: "Why does everything about my body feel different all of a sudden?" },
                { character: "Narrator", type: "thought", text: "Her school bus horn sounded. Meera grabbed her bag and ran — but the mirror came with her." }
              ]
            }
          ]
        },
        {
          pageNumber: 3,
          title: "The Girl Who Looked Fine",
          image: "assets/images/story/page_3.jpg",
          panels: [
            {
              id: "bi_p1_3",
              description: "By lunchtime, Meera sat with Tara under their tree. She watched another girl walk across the playground — confident, perfect hair, effortless clothes. Meera looked down at herself; her uniform suddenly felt boring.",
              dialogue: [
                { character: "Meera", type: "thought", text: "I wish I had her hair. I wish I were that tall. I wish my skin looked like that." },
                { character: "Narrator", type: "thought", text: "Everyone else got a compliment. Meera got the comparison." }
              ]
            }
          ]
        },
        {
          pageNumber: 4,
          title: "The Five-Minute Scroll",
          image: "assets/images/story/page_4.jpg",
          panels: [
            {
              id: "bi_p1_4",
              description: "That evening, Meera opened her phone for 5 minutes. One video appeared. Then another. Girls with glowing skin, perfect outfits, transformation videos. Meera took a picture, deleted it. Tried another angle, deleted that too.",
              dialogue: [
                { character: "Meera", type: "thought", text: "Why don't I look like the girls I've been watching on my feed?" },
                { character: "Narrator", type: "thought", text: "Her phone buzzed. Gigi." }
              ]
            }
          ]
        },
        {
          pageNumber: 5,
          title: "Gigi's Question",
          image: "assets/images/story/page_5.jpg",
          panels: [
            {
              id: "bi_p1_5",
              description: "Gigi didn't give a dramatic lecture. There was just one simple question on the screen.",
              dialogue: [
                { character: "Gigi", type: "speech", text: "Meera, are you comparing your real life with somebody else's best picture?" },
                { character: "Meera", type: "thought", text: "She had used a carefully selected 5-second highlight reel to judge all of her real life." }
              ]
            }
          ]
        }
      ]
    }
  },

  {
    nodeId: "bi_mirror_shifter",
    type: "mirror_reflection_flip",
    position: "random_pool",
    title: "The Mirror Perspective Shifter",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "The Mirror Perspective Shifter",
      instruction: "Tap each mirror card to flip critical thoughts into empowering body-neutrality perspectives!",
      cards: [
        {
          id: "mcard1",
          thoughtEmoji: "😟",
          thoughtText: "My clothes don't fit like they used to, so my body must be the problem.",
          perspectiveEmoji: "✨",
          perspectiveText: "Clothes are manufactured to fit MY body — my body isn't manufactured to fit clothes!"
        },
        {
          id: "mcard2",
          thoughtEmoji: "📱",
          thoughtText: "Everyone else online looks so grown up and flawless compared to me.",
          perspectiveEmoji: "🔍",
          perspectiveText: "Feeds only show filtered highlight reels — everyone has hair tutorials, deleted takes, and insecurity behind the screen."
        },
        {
          id: "mcard3",
          thoughtEmoji: "🌿",
          thoughtText: "I wish I had her hair, her height, and her skin.",
          perspectiveEmoji: "🌸",
          perspectiveText: "Comparison steals my joy — I am building my own unique combination of traits and strengths."
        },
        {
          id: "mcard4",
          thoughtEmoji: "🪞",
          thoughtText: "One side of my body looks slightly different than the other.",
          perspectiveEmoji: "🎨",
          perspectiveText: "Asymmetry during puberty is 100% normal. Human bodies aren't created with a copy-paste tool!"
        },
        {
          id: "mcard5",
          thoughtEmoji: "⌛",
          thoughtText: "I need to look perfect before I can enjoy my day and feel confident.",
          perspectiveEmoji: "💛",
          perspectiveText: "My body doesn't need to be perfect for me to live, laugh, draw, and be happy today!"
        }
      ],
      completionMessage: "Amazing perspective shift! Remembering that your body is a living home — not a picture to be judged — unlocks true confidence."
    }
  },

  {
    nodeId: "bi_story_2",
    type: "story",
    position: "random_pool",
    title: "Meera and the Mirror (Part 2)",
    estMinutes: 5,
    xpReward: 20,
    content: {
      pages: [
        {
          pageNumber: 1,
          title: "The Comment",
          image: "assets/images/story/page_6.jpg",
          panels: [
            {
              id: "bi_p2_1",
              description: "The next day, a classmate casually said, 'You've changed so much lately.' One sentence. The conversation moved on, but Meera replayed it during science, during lunch, and on the walk home.",
              dialogue: [
                { character: "Meera", type: "thought", text: "Did she mean I look bigger? Did she mean I look strange?" },
                { character: "Narrator", type: "thought", text: "A comment is not a fact. During puberty, you are supposed to change." }
              ]
            }
          ]
        },
        {
          pageNumber: 2,
          title: "Saturday Shopping & The Label",
          image: "assets/images/story/page_7.jpg",
          panels: [
            {
              id: "bi_p2_2",
              description: "At the mall, Meera picked up a top she'd seen online. In the fitting room, it didn't look like the model. Her first thought was: 'Maybe my body is the problem.'",
              dialogue: [
                { character: "Tara", type: "speech", text: "Sometimes clothes look amazing on the hanger and completely weird once you put them on!" },
                { character: "Meera", type: "thought", text: "A clothing label is just a number. Clothes are supposed to fit people — people aren't supposed to change themselves to fit a tag number!" }
              ]
            }
          ]
        },
        {
          pageNumber: 3,
          title: "The Conversation at Lunch",
          image: "assets/images/story/page_8.jpg",
          panels: [
            {
              id: "bi_p2_3",
              description: "On Monday, her friends started complaining about their stomachs, legs, and hair — a strange competition of who disliked themselves the most.",
              dialogue: [
                { character: "Meera", type: "speech", text: "Can we please stop doing a body roast for five minutes?" },
                { character: "Narrator", type: "thought", text: "Everyone laughed, and the conversation shifted. Sometimes the way we talk about our bodies becomes the way we learn to see them." }
              ]
            }
          ]
        },
        {
          pageNumber: 4,
          title: "What Does My Body Do For Me?",
          image: "assets/images/story/page_9.jpg",
          panels: [
            {
              id: "bi_p2_4",
              description: "Walking home at sunset, Meera felt her body in a new way. Her feet had carried her. Her legs climbed stairs. Her hands wrote notes. Her heart beat quietly.",
              dialogue: [
                { character: "Meera", type: "thought", text: "Instead of asking 'How do I look?', what if I ask 'What does my body do for me?'" },
                { character: "Narrator", type: "thought", text: "Maybe her body wasn't something to constantly inspect. Maybe it was something to live in." }
              ]
            }
          ]
        },
        {
          pageNumber: 5,
          title: "Mum's Old Photo & The Real Unlock",
          image: "assets/images/story/page_10.jpg",
          panels: [
            {
              id: "bi_p2_5",
              description: "That night, Mum showed her an old photo album of herself as a teenager. Mum admitted she used to worry about the exact same things.",
              dialogue: [
                { character: "Mum", type: "speech", text: "Growing up isn't about becoming a perfect version of yourself. It's about getting to know yourself and learning not to be your own harshest critic." },
                { character: "Gigi", type: "speech", text: "Your body isn't a trend or a before-and-after picture. It's the body that's growing with you." }
              ]
            }
          ]
        }
      ]
    }
  },

  {
    nodeId: "bi_filter_unmask",
    type: "comparison_filter_unmask",
    position: "random_pool",
    title: "Feed vs. Reality Unmasker",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "Feed vs. Reality Unmasker",
      instruction: "Slide the Reality Lens to reveal the truth behind filtered social media posts!",
      posts: [
        {
          id: "post1",
          username: "@glam_fit_teen",
          userEmoji: "📸",
          filteredText: "✨ 'Woke up like this! Flawless waist & zero effort glow 🔥'",
          realityText: "📸 30 minutes of posing, ring light setup, 40 deleted photos, and a digital waist filter.",
          gigiInsight: "Nobody wakes up with studio lighting on their face! Poses and lighting create optical illusions.",
          filteredImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
          realityImageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80"
        },
        {
          id: "post2",
          username: "@flawless_glow_daily",
          userEmoji: "💅",
          filteredText: "🌸 'Glass skin secret revealed — 100% natural poreless skin!'",
          realityText: "🎨 Heavy beauty blur filter, skin smoothing effect, and airbrushed textures.",
          gigiInsight: "Pores, skin texture, and occasional breakouts are proof of a living body — not a flaw!",
          filteredImageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
          realityImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80"
        },
        {
          id: "post3",
          username: "@effortless_style_vlog",
          userEmoji: "👗",
          filteredText: "👜 'Casual Monday outfit! Everything fits so perfectly effortlessly'",
          realityText: "📌 Clothes pinned behind the back, sponsored outfit, and strict standing angle.",
          gigiInsight: "Clothes on feed posts are often clipped and styled specifically for 1 static angle.",
          filteredImageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
          realityImageUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80"
        },
        {
          id: "post4",
          username: "@quick_glowup_tips",
          userEmoji: "⚡",
          filteredText: "🌟 'Total 3-day body transformation! Try this secret trick!'",
          realityText: "⏳ High contrast lighting, tensed muscles, and selectively cropped before/after frames.",
          gigiInsight: "Real body growth during puberty takes months and years — 15-second tricks are marketing tricks!",
          filteredImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
          realityImageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80"
        }
      ],
      completionMessage: "Great unmasking! Remember Gigi's rule: Never compare your real 24/7 life to somebody else's 5-second edited highlight reel."
    }
  },

  {
    nodeId: "bi_label_reframe",
    type: "drag_to_sort",
    position: "random_pool",
    title: "Clothing Size vs. Who You Are",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "Clothing Size vs. Who You Are",
      bins: [
        {
          id: "tag_label",
          label: "Just a Label / Number",
          emoji: "🏷️",
          colorHex: "EC4899"
        },
        {
          id: "true_value",
          label: "True Value & Character",
          emoji: "💛",
          colorHex: "7C3AED"
        }
      ],
      items: [
        {
          id: "bi_i1",
          emoji: "🏷️",
          text: "Size S, M, or L tag inside a pair of jeans",
          correctBinId: "tag_label",
          learningNote: "Clothing sizes vary wildly between brands — a size tag is just manufacturing shorthand."
        },
        {
          id: "bi_i2",
          emoji: "🎨",
          text: "How much creativity and passion you put into your art",
          correctBinId: "true_value",
          learningNote: "Your talents and passions express your unique identity — no label can measure that!"
        },
        {
          id: "bi_i3",
          emoji: "💬",
          text: "A casual comment someone dropped about your height",
          correctBinId: "tag_label",
          learningNote: "Comments are passing observations, not facts about your worth."
        },
        {
          id: "bi_i4",
          emoji: "🤗",
          text: "How warmly you comfort a friend when they are upset",
          correctBinId: "true_value",
          learningNote: "Kindness and empathy build deep, meaningful connections."
        },
        {
          id: "bi_i5",
          emoji: "📱",
          text: "The number of likes or views on a photo post",
          correctBinId: "tag_label",
          learningNote: "Algorithm numbers have zero connection to your character or value."
        },
        {
          id: "bi_i6",
          emoji: "💪",
          text: "How hard you work and bounce back when things are tough",
          correctBinId: "true_value",
          learningNote: "Resilience is a core strength that grows with you throughout life."
        }
      ],
      completionMessage: "Perfectly sorted! Clothing tags and screen numbers are just labels — your character, warmth, and resilience are what define you."
    }
  },

  {
    nodeId: "bi_mythbusters",
    type: "myth_busters",
    position: "random_pool",
    title: "Body Image Myths: Busted!",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "Body Image Myths: Busted!",
      myths: [
        {
          id: "bim1",
          statement: "People who look confident online never feel insecure about their bodies.",
          isMyth: true,
          explanation: "BUSTED! Everyone experiences moments of self-doubt. Feed posts only capture curated seconds, not full feelings."
        },
        {
          id: "bim2",
          statement: "Your clothing size measures your health and personal worth.",
          isMyth: true,
          explanation: "BUSTED! Clothing sizes are arbitrary industry numbers. Clothes are made to fit your body, not vice versa!"
        },
        {
          id: "bim3",
          statement: "You must love every single detail of your body every single day to be confident.",
          isMyth: true,
          explanation: "BUSTED! Body neutrality means respecting and appreciating what your body DOES, even on days you don't feel 100% perfect."
        },
        {
          id: "bim4",
          statement: "Puberty changes in shape and weight mean something is wrong with you.",
          isMyth: true,
          explanation: "BUSTED! Puberty changes are expected biological milestones as your body develops into adult shape."
        }
      ],
      completionMessage: "Mythbusting complete! You now have the media literacy to see past social media traps and treat your body with respect."
    }
  },

  {
    nodeId: "bi_body_jar",
    type: "body_appreciation_jar",
    position: "random_pool",
    title: "My Body's Superpower Jar",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "My Body's Superpower Jar",
      instruction: "Tap or drag each superpower gem to fill your body gratitude jar!",
      gems: [
        {
          id: "gem1",
          emoji: "🫀",
          shortLabel: "Heartbeat",
          actionText: "Heart beats 100,000 times a day without me ever having to ask"
        },
        {
          id: "gem2",
          emoji: "🦵",
          shortLabel: "Stairs & Walks",
          actionText: "Legs carried me up 4 flights of stairs and walked all around school"
        },
        {
          id: "gem3",
          emoji: "🎨",
          shortLabel: "Drawing & Hugs",
          actionText: "Hands drew sketches, wrote notes, and hugged my best friend"
        },
        {
          id: "gem4",
          emoji: "🗣️",
          shortLabel: "Laughing Out Loud",
          actionText: "Lungs and voice let me laugh out loud at jokes with Tara"
        },
        {
          id: "gem5",
          emoji: "👁️",
          shortLabel: "Reading & Sunsets",
          actionText: "Eyes read my favourite books and saw the golden sunset walking home"
        }
      ],
      completionMessage: "Your gratitude jar is full! Your body is not a picture to constantly inspect — it's the living home that powers your life every day."
    }
  },

  {
    nodeId: "bi_quiz",
    type: "quiz",
    position: "random_pool",
    title: "Body Confidence & Media Literacy Quiz",
    estMinutes: 4,
    xpReward: 25,
    content: {
      title: "Body Confidence Quiz",
      questions: [
        {
          id: "biq1",
          question: "When Meera felt bad after scrolling social media for 30 minutes, what did Gigi ask her?",
          options: [
            "Why aren't you posting more photos?",
            "Are you comparing your real life with somebody else's best picture?",
            "Should you buy new clothes online?",
            "Why don't you try a new workout filter?"
          ],
          correctIndex: 1,
          explanation: "Gigi reminded Meera that social media feeds are curated highlight reels — comparing real life to edited posts creates false insecurity."
        },
        {
          id: "biq2",
          question: "In the mall fitting room, when a top didn't fit Meera the way it looked online, what did Tara realize?",
          options: [
            "Meera needs to change her body shape immediately",
            "Clothes look weird on hangers sometimes; clothes are made to fit bodies, not vice versa!",
            "They should stop shopping forever",
            "Tags are the most important thing in school"
          ],
          correctIndex: 1,
          explanation: "Clothes are manufactured items. If an item doesn't fit, it's a design mismatch — never a body flaw!"
        },
        {
          id: "biq3",
          question: "What is 'Body Neutrality'?",
          options: [
            "Forcing yourself to pretend every single detail is perfect 24/7",
            "Respecting and appreciating what your body DOES for you, without constantly judging how it looks",
            "Ignoring health completely",
            "Only wearing black clothes"
          ],
          correctIndex: 1,
          explanation: "Body neutrality shifts focus from 'How do I look?' to 'What does my body do for me?', building steady self-kindness."
        }
      ],
      completionMessage: "Quiz mastered! You have strong media literacy skills and a healthy perspective on body confidence."
    }
  },

  {
    nodeId: "bi_talk_decoder",
    type: "scenario_choice",
    position: "random_pool",
    title: "Reframing Friend Group Body Talk",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "Reframing Friend Group Body Talk",
      scenarios: [
        {
          id: "scen1",
          situation: "At the lunch table, your friends start picking their bodies apart ('I hate my hair', 'My stomach looks weird'). How do you break the loop?",
          choices: [
            {
              text: "Join in and list things you dislike about your own body too.",
              isCorrect: false,
              isBest: false,
              feedback: "Joining the 'body roast' normalizes critical self-talk for everyone.",
              gigiResponse: "Joining in might feel relatable in the moment, but it keeps everyone trapped in body criticism. Try steering the conversation somewhere uplifting instead! 🌸"
            },
            {
              text: "Gently say 'Can we pause the body roast?' and shift conversation to music or weekend plans.",
              isCorrect: true,
              isBest: true,
              feedback: "Perfect! Reframing the talk protects your group's mental space and breaks negative habits.",
              gigiResponse: "Spot on! Calling out body roasts with gentle warmth sets a healthy boundary for your friends and protects everyone's peace of mind! 💖"
            }
          ]
        },
        {
          id: "scen2",
          situation: "You catch yourself taking 10 selfies and deleting every single one because of your angle. What's the best action?",
          choices: [
            {
              text: "Put your phone down, take a breath, and focus on an activity you enjoy in real life.",
              isCorrect: true,
              isBest: true,
              feedback: "Spot on! Stepping away from the camera helps reset your perspective.",
              gigiResponse: "Wise move! Your worth isn't measured in megapixels or camera angles. Stepping into real-life moments resets your perspective instantly! 🌟"
            },
            {
              text: "Download 3 new editing apps to smooth out your face.",
              isCorrect: false,
              isBest: false,
              feedback: "Editing apps reinforce the false idea that real faces need digital fixing.",
              gigiResponse: "Digital filters create unrealistic standards that nobody can live up to in real life. You don't need filters to be worthy of confidence! ✨"
            }
          ]
        }
      ],
      completionMessage: "Scenario mastered! You know how to guide friend conversations toward warmth and protect your peace of mind."
    }
  },

  {
    nodeId: "bi_reflection",
    type: "reflection_reward",
    position: "fixed_end",
    title: "Body Image Unlocked: Complete",
    estMinutes: 4,
    xpReward: 30,
    unlocksBadge: "body_image_graduate",
    content: {
      moodQuestion: {
        prompt: "Before you go — how do you feel about your changing body and social media feed now?",
        options: [
          {
            emoji: "😌",
            label: "Relieved & Free",
            gigiResponse: "That relief is well-earned! Remembering that your body is a living home — not a filtered picture — gives you freedom."
          },
          {
            emoji: "💪",
            label: "Media Smart & Strong",
            gigiResponse: "Yes! You now have the lens to see right through edited feeds, ring lights, and clothing tags."
          },
          {
            emoji: "🫀",
            label: "Grateful for My Body",
            gigiResponse: "Your heart, legs, hands, and lungs work for you every second. Celebrating what your body DOES is true confidence."
          },
          {
            emoji: "💛",
            label: "Kind to Myself",
            gigiResponse: "You don't have to look perfect before you are allowed to enjoy your life. You just have to be you."
          }
        ]
      },
      recapCards: [
        { emoji: "🪞", text: "Your body is changing during puberty — change is natural development, not something to be judged." },
        { emoji: "📱", text: "Never compare your real 24/7 life to somebody else's 5-second edited highlight reel." },
        { emoji: "🏷️", text: "Clothing sizes are manufacturing shorthand — clothes are made to fit you, not vice versa!" },
        { emoji: "🥗", text: "Reframing negative 'body roast' talk with friends protects everyone's peace of mind." },
        { emoji: "🫀", text: "Shift from 'How do I look?' to 'What does my body DO for me every day?'" }
      ],
      badge: {
        id: "body_image_graduate",
        name: "Body Image Master",
        emoji: "🪞",
        description: "Awarded for completing Episode 6: Body Image Unlocked — mastering media literacy, body neutrality, and self-kindness!",
        totalPieces: 10
      },
      closingMessage: {
        character: "Meera",
        text: "Your body isn't a trend. It isn't a comparison. And it isn't a before-and-after picture. It's the home that's growing with you. You don't have to look like anyone online — you just have to be you. And that's already a pretty good place to start. 💛"
      },
      nextEpisode: {
        title: "Hygiene Hero",
        emoji: "🧼",
        teaser: "Mastering skincare, sweat, deodorant, and daily self-care routines with confidence!"
      }
    }
  }
];

async function seed() {
  console.log("🪞 Seeding Episode 6: Body Image Unlocked (ce_body_image)...");
  const updated = await prisma.creativeEpisode.upsert({
    where: { id: "ce_body_image" },
    create: {
      id: "ce_body_image",
      journeyId: "cj_my_changing_body",
      title: "6. Body Image Unlocked",
      description: "From morning mirror checks to fitting room moments and social media feeds — Meera's story of mastering body neutrality, unmasking filters, and celebrating what her body does every day.",
      episodeIcon: "🪞",
      order: 6,
      nodes: BODY_IMAGE_NODES as any,
      totalXP: 220,
      isActive: true
    },
    update: {
      title: "6. Body Image Unlocked",
      description: "From morning mirror checks to fitting room moments and social media feeds — Meera's story of mastering body neutrality, unmasking filters, and celebrating what her body does every day.",
      episodeIcon: "🪞",
      order: 6,
      nodes: BODY_IMAGE_NODES as any,
      totalXP: 220,
      isActive: true
    }
  });

  console.log(`✅ Episode 6 seeded: "${updated.title}" with ${BODY_IMAGE_NODES.length} nodes & ${updated.totalXP} total XP`);
  console.log("  Nodes seeded:");
  BODY_IMAGE_NODES.forEach((n: any, i: number) => {
    console.log(`  ${i + 1}. [${n.type}] ${n.title} (+${n.xpReward} XP)`);
  });
}

seed()
  .catch((e) => {
    console.error("❌ Episode 6 seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
