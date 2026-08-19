/**
 * Seed script for the Creative Learning Journey v2 module.
 * Run: npx tsx src/modules/creative-journey/creative-journey.seed.ts
 */

import { prisma } from "../../db/client.js";

const BODY_TIMELINE_NODES = [
  // ── NODE 1 — FIXED START: Story ─────────────────────────────────────────────
  {
    nodeId: "bt_story",
    type: "story",
    position: "fixed_start",
    title: "Mira's Mystery Letter",
    estMinutes: 4,
    xpReward: 5,
    content: {
      pages: [
        {
          pageNumber: 1,
          title: "The Kitchen Doorframe",
          image: "assets/images/story/page_2.jpg",
          panels: [
            {
              id: "p2_1",
              description: "The kitchen smelled like fresh chai. Don't move...",
              dialogue: [{ character: "Meera", type: "speech", text: "Four centimeters... in three months... I measured three times." }],
            },
          ],
        },
        {
          pageNumber: 3,
          title: "Growing Apart?",
          image: "assets/images/story/page_3.jpg",
          panels: [
            {
              id: "p3_1",
              description: "Her eyes moved to the marks right beside hers. Nadia. Same dates. Same height.",
              dialogue: [{ character: "Meera", type: "thought", text: "Then how is she still the same... and I'm not?" }],
            },
          ],
        },
        {
          pageNumber: 4,
          title: "Same Place. Different Stories.",
          image: "assets/images/story/page_4.jpg",
          panels: [
            {
              id: "p4_1",
              description: "Meera quickly pulled out her phone, snapped a picture, and messaged Gigi.",
              dialogue: [{ character: "Meera", type: "thought", text: "What if growing up doesn't happen at the same time for everyone?" }],
            },
          ],
        },
        {
          pageNumber: 5,
          title: "Not the Same Timeline",
          image: "assets/images/story/page_5.jpg",
          panels: [
            {
              id: "p5_1",
              description: "That night, something felt... off. Zoomed in. Her mark higher. Nadia's... stuck.",
              dialogue: [{ character: "Meera", type: "thought", text: "Wait... what? Her chest tightened a little." }],
            },
          ],
        },
        {
          pageNumber: 6,
          title: "We've Literally Grown Up The Same",
          image: "assets/images/story/page_6.jpg",
          panels: [
            {
              id: "p6_1",
              description: "We've literally grown up the same, she muttered. Same class. Same food. Same everything.",
              dialogue: [{ character: "Meera", type: "thought", text: "What if something is wrong with me?" }],
            },
          ],
        },
      ],
    },
  },

  // ── NODE 2 — Mystery Task Box ──────────────────────────────────────────────
  {
    nodeId: "bt_mysterybox",
    type: "mystery_task_box",
    position: "random_pool",
    title: "What's in the Growth Box?",
    energyTag: "active",
    xpReward: 10,
    content: {
      flaps: [
        {
          id: 1,
          type: "fact_task",
          factText: "During puberty, it's common to grow 2–4 inches in a single year — sometimes called a 'growth spurt.' Hands and feet often grow first!",
          task: {
            question: "Tap the body part you think grows first?",
            options: ["Hands & Feet", "Torso", "Head"],
            correctIndex: 0,
            feedbackText: "Ooh, interesting! Hands and feet really do tend to shoot up first — the rest catches up soon after 🌱",
          },
        },
        {
          id: 2,
          type: "mini_task",
          prompt: "Measure your own hand span right now (or guess!) — tap the size that feels closest.",
          options: [
            { label: "Small (< 7 inches)", emoji: "✋" },
            { label: "Medium (7–8 inches)", emoji: "🖐" },
            { label: "Large (> 8 inches)", emoji: "👋" },
          ],
          feedbackText: "There's no right answer here — every hand is perfectly sized for its person! 💛",
        },
        {
          id: 3,
          type: "fact_reflection",
          factText: "Skin can get a bit oilier during puberty because of hormones — that's why some people start noticing more shine or occasional pimples.",
          reflectionPrompt: "How does that make you feel?",
          emojiOptions: ["😌 Fine", "😬 Nervous", "🤷 Not sure"],
          isPrivate: true,
          feedbackText: "All of those feelings are completely valid! Knowing what to expect makes it a little less surprising 💜",
        },
        {
          id: 4,
          type: "sticker_reward",
          message: "You opened the whole Growth Box! Here's your sticker 🎁",
          stickerEmoji: "📦✨",
        },
      ],
    },
  },

  // ── NODE 3 — Quiz ──────────────────────────────────────────────────────────
  {
    nodeId: "bt_quiz",
    type: "quiz",
    position: "random_pool",
    title: "Timeline Trivia",
    energyTag: "reflective",
    xpReward: 10,
    passThreshold: 0.6,
    content: {
      questions: [
        {
          id: "q1",
          text: "Puberty usually happens somewhere between which ages?",
          options: ["3–6", "8–14", "16–20", "There's an exact age for everyone"],
          correctIndex: 1,
          feedback: "Right — and even 8–14 is a wide range, because every body's road is different! 🌸",
        },
        {
          id: "q2",
          text: "True or False: Everyone starts puberty on exactly the same day as their friends.",
          options: ["True", "False"],
          correctIndex: 1,
          feedback: "Totally false — and that's a good thing to remember next time you compare yourself to a friend. 💛",
        },
        {
          id: "q3",
          text: "Which of these is a normal part of the Body Timeline?",
          options: ["Growth spurts", "Skin changes", "New body hair", "All of the above"],
          correctIndex: 3,
          feedback: "Yep — all of it! Different stops on the same road. 🗺️",
        },
        {
          id: "q4",
          text: "What are 'growing pains'?",
          options: ["A sign something's wrong", "Achy legs from fast bone growth", "Something only athletes get"],
          correctIndex: 1,
          feedback: "Exactly — bones can grow faster than muscles adjust, and that can feel achy. It passes. 💪",
        },
        {
          id: "q5",
          text: "If your timeline looks different from your friend's, that means:",
          options: ["Something is wrong with you", "You should ask a doctor to speed it up", "You're both perfectly normal, just on your own pace"],
          correctIndex: 2,
          feedback: "That's the whole point of today's episode. 💛",
        },
      ],
    },
  },

  // ── NODE 4 — Watch Video ───────────────────────────────────────────────────
  {
    nodeId: "bt_video",
    type: "watch_video",
    position: "random_pool",
    title: "60 Seconds on Growth Spurts",
    energyTag: "reflective",
    xpReward: 5,
    content: {
      youtubeVideoId: "PLACEHOLDER_VIDEO_ID",
      thumbnailEmoji: "🎬",
      scriptSummary: "Gigi walks along the timeline road explaining growth spurts — fast bone growth, growing pains, and how every body's spurt is different.",
      postVideoQuestion: {
        text: "Did you know growing pains were a real thing?",
        options: ["👍 Yes, I knew!", "😲 No, that's new!"],
        isScored: false,
        feedbackText: "Now you know — and knowing makes it way less scary when it happens! 🌱",
      },
    },
  },

  // ── NODE 5 — Identify Image ────────────────────────────────────────────────
  {
    nodeId: "bt_identify",
    type: "identify_image",
    position: "random_pool",
    title: "Spot What's True",
    energyTag: "active",
    xpReward: 7,
    content: {
      instruction: "Tap ALL the icons that show a normal part of the Body Timeline.",
      icons: [
        { id: "shoe", emoji: "👟", label: "Trying on a bigger shoe", isCorrect: true },
        { id: "height", emoji: "📏", label: "Comparing heights with a friend", isCorrect: true },
        { id: "magazine", emoji: "📰", label: "Comparing yourself to a magazine model", isCorrect: false, distractorNote: "Magazines often show edited images — they're not a fair comparison for anybody's real timeline." },
        { id: "pimple", emoji: "🪞", label: "Noticing a pimple in the mirror", isCorrect: true },
        { id: "stretch", emoji: "🤸", label: "Stretching after a growth ache", isCorrect: true },
        { id: "worry", emoji: "💭", label: "Feeling worried about being 'too early'", isCorrect: true },
      ],
      completionMessage: "Great detective work! You spotted what's real — and what's not a fair comparison. 🔍",
    },
  },

  // ── NODE 6 — Myth Busters ──────────────────────────────────────────────────
  {
    nodeId: "bt_mythbusters",
    type: "myth_busters",
    position: "random_pool",
    title: "True or Myth?",
    energyTag: "reflective",
    xpReward: 8,
    content: {
      instruction: "Swipe RIGHT for TRUE → swipe LEFT for MYTH",
      cards: [
        {
          id: "m1",
          statement: "Once you start puberty, everything changes overnight.",
          verdict: "MYTH",
          explanation: "It's usually gradual — small changes over months and years, not one big overnight switch. 🌙",
        },
        {
          id: "m2",
          statement: "Growth spurts can make you clumsy for a while.",
          verdict: "TRUE",
          explanation: "Your brain is still catching up to your new arm/leg length — totally normal. 🧠",
        },
        {
          id: "m3",
          statement: "If you get your period later than your friends, something's wrong.",
          verdict: "MYTH",
          explanation: "Periods can start anywhere roughly between 9 and 16 — both ends of that range are normal. 🌸",
        },
        {
          id: "m4",
          statement: "Boys and girls go through puberty at the exact same time.",
          verdict: "MYTH",
          explanation: "On average, girls' bodies often start a bit earlier than boys', but it varies a lot person to person. 💜",
        },
        {
          id: "m5",
          statement: "You can't do anything to control exactly when puberty starts.",
          verdict: "TRUE",
          explanation: "It's mostly set by your own biology/genes — not something you did or didn't do. 🌿",
        },
      ],
    },
  },

  // ── NODE 7 — Timeline Builder ──────────────────────────────────────────────
  {
    nodeId: "bt_timelinebuilder",
    type: "timeline_builder",
    position: "random_pool",
    title: "Build Your Own Timeline",
    energyTag: "active",
    xpReward: 8,
    content: {
      instruction: "Drag and drop the changes into the order you think they happen.",
      cards: [
        { id: "c1", emoji: "📈", label: "Growth Spurt" },
        { id: "c2", emoji: "✨", label: "Skin Changes" },
        { id: "c3", emoji: "🌿", label: "New Body Hair" },
        { id: "c4", emoji: "🌸", label: "Body Shape Changes" },
        { id: "c5", emoji: "🌊", label: "Emotional Ups & Downs" },
        { id: "c6", emoji: "🩸", label: "Periods Start" },
      ],
      revealMessage: "However you arranged these — that's a totally valid way it could go! In real life, this order is different for almost everyone. You just built A timeline, not THE timeline. There's no single right answer here — and that's the whole point. 💛",
    },
  },

  // ── NODE 8 — Spot the Change ───────────────────────────────────────────────
  {
    nodeId: "bt_growthdetective",
    type: "spot_the_change",
    position: "random_pool",
    title: "Growth Detective",
    energyTag: "active",
    xpReward: 7,
    content: {
      instruction: "Tap the 5 differences you can spot between Riya at age 9 and age 13.",
      character: "Riya",
      differences: [
        { id: "d1", emoji: "📏", label: "She's taller", hint: "Look at where she stands next to the bus stop sign" },
        { id: "d2", emoji: "👟", label: "Her shoes are bigger", hint: "Check the size of her trainers" },
        { id: "d3", emoji: "💇", label: "Her hairstyle changed", hint: "Look at her hair length and style" },
        { id: "d4", emoji: "😊", label: "She looks more confident", hint: "Notice her expression and posture" },
        { id: "d5", emoji: "🧴", label: "She has a skincare item in her bag", hint: "Look at what's peeking out of her bag" },
      ],
      completionMessage: "You spotted growth — the visible kind AND the invisible kind (confidence!). Your own timeline will have its own differences, and they'll be worth spotting too. 🔍✨",
    },
  },

  // ── NODE 9 — Emoji Decoder Wheel ──────────────────────────────────────────
  {
    nodeId: "bt_emoji_decoder",
    type: "emoji_decoder",
    position: "random_pool",
    title: "Timeline Decoder Wheel 🎭",
    energyTag: "active",
    xpReward: 8,
    content: {
      title: "Timeline Emotion Decoder 🎭",
      instruction: "Spin and tap the emoji that best captures the feeling in each timeline scene!",
      scenarios: [
        {
          character: "Meera",
          scene: "Meera noticed her favorite pair of jeans from last summer didn't reach her ankles anymore.",
          sceneEmoji: "👖",
          options: ["😯", "😡", "😭", "😌"],
          correctEmoji: "😯",
          gigiResponse: "Spot on! Growth spurts happen fast during puberty — your legs grow before your wardrobe catches up!",
          wrongResponse: "Growth spurts can feel surprising at first, but it means your long bones are lengthening normally!"
        },
        {
          character: "Mira",
          scene: "Mira's friend started growing taller before her, while Mira hadn't noticed any height change yet.",
          sceneEmoji: "⏱️",
          options: ["😟", "🤔", "👑", "💖"],
          correctEmoji: "🤔",
          gigiResponse: "Exactly! Everyone's body timeline runs on its own unique inner clock — there is no race to finish first!",
          wrongResponse: "Curiosity is great! Remember, your timing is programmed by your unique genetics."
        },
        {
          character: "Gigi's Note",
          scene: "When you realize that your body's changes aren't a mistake, but proof that your growth masterplan is working.",
          sceneEmoji: "✨",
          options: ["💖", "🌟", "😌", "🥳"],
          correctEmoji: "💖",
          gigiResponse: "Yes! Your body is working hard every day to build your healthy adult self with total pride!",
          wrongResponse: "Embracing your body's timing gives you total peace of mind!"
        }
      ]
    }
  },

  // ── NODE 10 — FIXED END: Reflection & Reward ──────────────────────────────
  {
    nodeId: "bt_reflect",
    type: "reflection_reward",
    position: "fixed_end",
    title: "Your Timeline, Your Pace",
    xpReward: 15,
    unlocksBadge: "timeline_explorer",
    content: {
      moodQuestion: {
        prompt: "Before you go — how are you feeling about your own Body Timeline right now?",
        options: [
          { emoji: "😌", label: "Calm", gigiResponse: "That's wonderful to hear. Your body is doing exactly what it's meant to do, at exactly the right time for you. 💛" },
          { emoji: "🤔", label: "Curious", gigiResponse: "Curiosity is the best superpower! Keep asking questions — every question is a step closer to understanding. 🌟" },
          { emoji: "😟", label: "A little nervous", gigiResponse: "That's completely understandable — change can feel big. But you now know so much more than you did at the start of this episode. You've got this. 💜" },
        ],
      },
      recapCards: [
        { emoji: "🌸", text: "Everybody's timeline looks different — and that's normal." },
        { emoji: "🗺️", text: "Growth spurts, skin changes, new hair, body shape, feelings, periods — all part of the same road." },
        { emoji: "💪", text: "Growing pains are real, and they pass." },
        { emoji: "💛", text: "Comparing yourself to magazines (or friends) isn't a fair measuring stick." },
        { emoji: "🤝", text: "A trusted adult is always a great person to talk to about your own timeline." },
      ],
      badge: {
        id: "timeline_explorer",
        name: "Timeline Explorer",
        emoji: "🗺️",
        description: "Awarded for completing The Body Timeline episode",
        totalPieces: 10,
      },
      closingMessage: {
        character: "Mira",
        text: "Thanks for walking the road with me, Detective. See you at the next stop?",
      },
      nextEpisode: {
        title: "Growing Pains",
        emoji: "🌱",
        teaser: "Find out why fast bone growth makes your legs achy!",
      },
    },
  },
];

async function seed() {
  console.log("🌱 Seeding Creative Learning Journey with multi-episode hierarchy...");

  // ── Journey 1: My Changing Body ───────────────────────────────────────────
  const journey1 = await prisma.creativeJourney.upsert({
    where: { id: "cj_my_changing_body" },
    update: {
      title: "My Changing Body",
      description:
        "A warm, funny, big-sister-style guide to puberty — from growth spurts to hormones, mood waves, skin stories, and everything in between.",
      ageBand: "9-15",
      icon: "🌸",
      isActive: true,
    },
    create: {
      id: "cj_my_changing_body",
      title: "My Changing Body",
      description:
        "A warm, funny, big-sister-style guide to puberty — from growth spurts to hormones, mood waves, skin stories, and everything in between.",
      ageBand: "9-15",
      icon: "🌸",
      isActive: true,
    },
  });

  // ── Journey 2: Period Diaries ──────────────────────────────────────────────
  const journey2 = await prisma.creativeJourney.upsert({
    where: { id: "cj_period_diaries" },
    update: {
      title: "Period Diaries",
      description:
        "Your friendly, empowering companion to understanding cycles, products, tracking, and self-care without any stress.",
      ageBand: "10-16",
      icon: "🩸",
      isActive: true,
    },
    create: {
      id: "cj_period_diaries",
      title: "Period Diaries",
      description:
        "Your friendly, empowering companion to understanding cycles, products, tracking, and self-care without any stress.",
      ageBand: "10-16",
      icon: "🩸",
      isActive: true,
    },
  });

  console.log(`✅ Journeys created: ${journey1.title}, ${journey2.title}`);

  // ── Episodes under "My Changing Body" ──────────────────────────────────────
  const episodesList = [
    {
      id: "ce_body_timeline",
      journeyId: journey1.id,
      title: "1. The Body Timeline",
      description: "Walk the Body Timeline with Mira and Gigi — bust myths, build your own timeline, and discover your body's timing.",
      episodeIcon: "🗺️",
      order: 1,
      nodes: BODY_TIMELINE_NODES,
      totalXP: 83,
      totalCoins: 83,
      isActive: true,
    },
    {
      id: "ce_growing_pains",
      journeyId: journey1.id,
      title: "2. Growing Pains",
      description: "Fast bone growth, split jeans, stretch marks, and why your body is working exactly as it should.",
      episodeIcon: "🌱",
      order: 2,
      nodes: [
        // ── NODE 1 — FIXED START: Story ───────────────────────────────────────
        {
          nodeId: "gp_story",
          type: "story",
          position: "fixed_start",
          title: "The Corridor Moment & Split Jeans",
          estMinutes: 5,
          xpReward: 20,
          content: {
            pages: [
              {
                pageNumber: 1,
                title: "The In-Between Moment",
                image: "assets/images/story/page_2.jpg",
                panels: [
                  {
                    id: "gp_p1_1",
                    description: "The school corridor was loud. Footsteps, lockers, laughter. Outside the bathroom door, Amara heard a quiet, shaky voice.",
                    dialogue: [
                      { character: "Amara", type: "speech", text: "Hey... I heard that. You okay?" },
                      { character: "Meera", type: "speech", text: "...No." },
                    ],
                  },
                ],
              },
              {
                pageNumber: 2,
                title: "The Split Seam",
                image: "assets/images/story/page_3.jpg",
                panels: [
                  {
                    id: "gp_p2_1",
                    description: "Amara pushed her yellow cardigan under the door gap. Meera stepped out keeping her back to the wall.",
                    dialogue: [
                      { character: "Meera", type: "speech", text: "My jeans split... at the seam. I bought them last month." },
                      { character: "Amara", type: "thought", text: "That's because your body is growing faster than your wardrobe can keep up. And that's a sign things are working!" },
                    ],
                  },
                ],
              },
              {
                pageNumber: 3,
                title: "The Science of Growth Plates",
                image: "assets/images/story/page_4.jpg",
                panels: [
                  {
                    id: "gp_p3_1",
                    description: "Amara sketched a femur bone in her notebook, pointing to the epiphyseal growth plates at the ends.",
                    dialogue: [
                      { character: "Amara", type: "speech", text: "These growth plates stay active from age 8 to 18. Some girls grow 8 to 10 cm in a year!" },
                      { character: "Meera", type: "thought", text: "So my femur just decided to level up... and my jeans weren't prepared?" },
                    ],
                  },
                ],
              },
              {
                pageNumber: 4,
                title: "Stretch Marks Reframed",
                image: "assets/images/story/page_5.jpg",
                panels: [
                  {
                    id: "gp_p4_1",
                    description: "Meera looked in the bathroom mirror and noticed faint silvery-pink lines on her hip.",
                    dialogue: [
                      { character: "Meera", type: "speech", text: "What are these lines?" },
                      { character: "Amara", type: "speech", text: "Collagen and elastin stretchy threads stretching faster than they rebuild. 40-70% of teens get them. They're receipts — a map of where your body grew!" },
                    ],
                  },
                ],
              },
              {
                pageNumber: 5,
                title: "Oestrogen & Body Reshaping",
                image: "assets/images/story/page_6.jpg",
                panels: [
                  {
                    id: "gp_p5_1",
                    description: "Amara explained how oestrogen stores fat in hips and chest to build adult shape, and why bones outpace muscles causing night leg aches.",
                    dialogue: [
                      { character: "Meera", type: "speech", text: "So my body isn't gaining bad weight... it's building structure?" },
                      { character: "Amara", type: "thought", text: "Exactly. Structure, design, and development!" },
                    ],
                  },
                ],
              },
              {
                pageNumber: 6,
                title: "My Body Is Working!",
                image: "assets/images/story/page_2.jpg",
                panels: [
                  {
                    id: "gp_p6_1",
                    description: "Back in class, Nadia asked if Meera was okay. Meera wrote on her notebook: 'Actually... yes. I think I'm growing.' Nadia drew a tiny star.",
                    dialogue: [
                      { character: "Amara", type: "speech", text: "Next time something feels off, remember: 'My body is working.' Not failing. Working." },
                    ],
                  },
                ],
              },
            ],
          },
        },

        // ── NODE 2 — Mystery Growth Box (Interactive Bone & Muscle Simulator) ──
        {
          nodeId: "gp_growth_plates_lab",
          type: "mystery_task_box",
          position: "random_pool",
          title: "Bone & Muscle Growth Simulator 🦴⚡",
          estMinutes: 3,
          xpReward: 20,
          content: {
            flaps: [
              {
                id: 1,
                type: "fact_task",
                factText: "At the ends of your long bones (like the femur in your thigh), there are active growth zones called epiphyseal growth plates!",
                task: {
                  question: "Which part of your long bones allows you to shoot up tall during puberty?",
                  options: ["Epiphyseal growth plates", "Muscle tendons", "Outer skin layer"],
                  correctIndex: 0,
                  feedbackText: "Spot on! Epiphyseal growth plates stay open between ages 8 and 18 to lengthen your bones! 🦴",
                },
              },
              {
                id: 2,
                type: "mini_task",
                prompt: "During a growth spurt, how many centimeters can a girl's height increase in a single year?",
                options: [
                  { label: "1–2 cm", emoji: "🌱" },
                  { label: "8–10 cm", emoji: "🚀" },
                  { label: "25–30 cm", emoji: "🦒" },
                ],
                feedbackText: "Bingo! Up to 8 to 10 cm in a single year! Hands and feet often sprout first, then your long bones! ⚡",
              },
              {
                id: 3,
                type: "fact_reflection",
                factText: "Growing pains happen because long bones grow faster than muscles can stretch and adjust — especially when resting at night.",
                reflectionPrompt: "Have you ever noticed achy shins or legs in the evening?",
                emojiOptions: ["🦵 Yes, often!", "🤔 Maybe once or twice", "😃 Not yet!"],
                isPrivate: true,
                feedbackText: "Achy legs in the evening are a normal sign that your bones are busy leveling up! 🌙",
              },
              {
                id: 4,
                type: "sticker_reward",
                message: "You mastered the Growth Simulator! Here's your Bone Builder Sticker 🎁",
                stickerEmoji: "🦴✨",
              },
            ],
          },
        },

        // ── NODE 3 — Spot the Change (Stretch Mark Map Decoder) ───────────────
        {
          nodeId: "gp_stretch_marks_decoder",
          type: "spot_the_change",
          position: "random_pool",
          title: "Stretch Mark Map Decoder 🗺️✨",
          estMinutes: 3,
          xpReward: 20,
          content: {
            instruction: "Tap ALL 5 hidden truths about your skin's stretchy collagen threads (striae)!",
            character: "Meera's Mirror",
            differences: [
              { id: "sm1", emoji: "🧬", label: "Collagen & Elastin Threads", hint: "Stretchy threads under skin that stretch during fast growth" },
              { id: "sm2", emoji: "📍", label: "Body Map Receipts", hint: "Faint pink or silvery lines proving your body leveled up" },
              { id: "sm3", emoji: "📊", label: "40–70% Teen Normal", hint: "Super common across teenagers regardless of weight or diet" },
              { id: "sm4", emoji: "🚫", label: "Not Damage or Flaw", hint: "Completely healthy evidence of rapid biological growth" },
              { id: "sm5", emoji: "🌸", label: "Adult Shape Development", hint: "Natural structural changes in hips, thighs, and chest" },
            ],
            completionMessage: "You decoded the map! Stretch marks are evidence of your body's amazing growth story. 🗺️✨",
          },
        },

        // ── NODE 4 — Myth Busters (Growing Stretch Myths) ─────────────────────
        {
          nodeId: "gp_mythbusters",
          type: "myth_busters",
          position: "random_pool",
          title: "Growing Stretch Myths 🛡️⚡",
          estMinutes: 4,
          xpReward: 20,
          content: {
            instruction: "Swipe RIGHT for TRUE → swipe LEFT for MYTH",
            cards: [
              {
                id: "m1",
                statement: "If your jeans split at the seam after one month, it means you gained bad weight.",
                verdict: "MYTH",
                explanation: "Myth! Your femur bone and body structure shoot up fast during growth spurts — your clothes just haven't caught up!",
              },
              {
                id: "m2",
                statement: "Stretch marks (striae) happen when collagen threads stretch faster than they rebuild.",
                verdict: "TRUE",
                explanation: "True! 40–70% of teenagers get pink, purple, or silver stretch lines as their skin adjusts to rapid growth.",
              },
              {
                id: "m3",
                statement: "Achy legs at night mean something is medically wrong with your knees or shins.",
                verdict: "MYTH",
                explanation: "Myth! Growing pains are mild, harmless aches occurring because bones grow faster than muscles adjust.",
              },
              {
                id: "m4",
                statement: "Oestrogen signals your body to store fat in hips and chest to build adult shape.",
                verdict: "TRUE",
                explanation: "True! This is your body's intentional, healthy adult design — not random weight gain!",
              },
              {
                id: "m5",
                statement: "Everyone's growth spurt starts at the exact same age.",
                verdict: "MYTH",
                explanation: "Myth! Growth plates open and close on their own unique biological timeline between ages 8 and 18.",
              },
            ],
          },
        },

        // ── NODE 5 — Quiz (Science & Mindset) ────────────────────────────────
        {
          nodeId: "gp_quiz",
          type: "quiz",
          position: "random_pool",
          title: "Do You Understand Your Body? 🧠🎯",
          estMinutes: 5,
          xpReward: 25,
          passThreshold: 0.6,
          content: {
            questions: [
              {
                id: "q1",
                text: "Which statement best explains why rapid height increase happens during puberty?",
                options: [
                  "Muscles grow faster than bones",
                  "Growth plates at the ends of bones remain active and allow elongation",
                  "Bones expand equally from all sides",
                  "Height increases due to fat accumulation",
                ],
                correctIndex: 1,
                feedback: "Growth plates (epiphyseal plates) are active zones where bones lengthen during puberty. 🦴",
              },
              {
                id: "q2",
                text: "Meera's jeans split after one month. What is the most scientifically accurate explanation?",
                options: [
                  "Poor fabric quality",
                  "Sudden weight gain",
                  "Rapid bone growth outpacing clothing fit",
                  "Incorrect washing method",
                ],
                correctIndex: 2,
                feedback: "Growth spurts can happen quickly — your wardrobe doesn't always keep up! 👖",
              },
              {
                id: "q3",
                text: "Which of the following is TRUE about stretch marks during puberty?",
                options: [
                  "They are caused by unhealthy eating habits",
                  "They are permanent skin damage",
                  "They occur due to rapid growth stretching deeper skin layers",
                  "Only overweight individuals experience them",
                ],
                correctIndex: 2,
                feedback: "They are natural and common (40–70% of teens) — your skin adjusting to growth. 🧬",
              },
              {
                id: "q4",
                text: "What role does oestrogen play during puberty?",
                options: [
                  "It reduces body fat",
                  "It prevents physical changes",
                  "It signals fat distribution in areas like hips and chest",
                  "It only affects mood",
                ],
                correctIndex: 2,
                feedback: "This is how your body develops its adult shape — by design! 🌸",
              },
              {
                id: "q5",
                text: "Which situation is MOST consistent with normal growing pains?",
                options: [
                  "Sharp pain in one leg during the day",
                  "Dull aching in both legs at night",
                  "Constant pain in one knee",
                  "Pain only after injury",
                ],
                correctIndex: 1,
                feedback: "Growing pains are usually mild, occur at night, and affect both legs. 🌙",
              },
              {
                id: "q6",
                text: "Which statement best reflects a scientifically accurate AND emotionally healthy understanding of puberty?",
                options: [
                  "Body changes should be controlled and minimized",
                  "Growth discomfort means something is wrong",
                  "Puberty is a structured biological process with individual variation",
                  "Everyone should develop at the same pace",
                ],
                correctIndex: 2,
                feedback: "This is the core idea: different timelines, same normal! 🌟",
              },
            ],
          },
        },

        // ── NODE 6 — Action Quest (My Body is Working Challenge) ─────────────
        {
          nodeId: "gp_quest",
          type: "timeline_builder",
          position: "random_pool",
          title: "My Body is Working Challenge 🌟",
          estMinutes: 4,
          xpReward: 25,
          content: {
            instruction: "Reorder the 4 steps of the 'My Body Is Working' Mindset Challenge to reframe uncomfortable moments into growth!",
            cards: [
              { id: "c1", emoji: "👁️", label: "STEP 1: Notice (Tight clothes, leg aches, sweat)" },
              { id: "c2", emoji: "🧠", label: "STEP 2: Catch Thought ('Something is wrong with me')" },
              { id: "c3", emoji: "🔄", label: "STEP 3: Reframe ('This is not failing... this is growth!')" },
              { id: "c4", emoji: "✍️", label: "STEP 4: Self-Anchor ('My body is working by design')" },
            ],
            revealMessage: "Challenge Unlocked! Next time something feels off, remember: 'This is not embarrassing. This is my body working!' 🌟",
          },
        },

        // ── NODE 7 — Ask Gigi (Anonymous Q&A Box) ────────────────────────────
        {
          nodeId: "gp_ask_gigi",
          type: "anonymous_question_box",
          position: "random_pool",
          title: "Ask Gigi: Growth & Body Changes 💭",
          estMinutes: 3,
          xpReward: 15,
          content: {
            prompt: "Got a question about growth spurts, stretch marks, or achy legs? Ask Gigi anonymously!",
            placeholder: "What's on your mind? 💭",
            privacyNote: "Your words are private. Only you (and a trusted parent/guardian) can see what you write here.",
            keywordResponses: [
              {
                keywords: ["stretch", "mark", "marks", "striae", "lines", "skin"],
                response: "Stretch marks are just your skin's stretchy collagen threads doing their best to keep up with your fast growth! 40–70% of teenagers get them — they're like receipts showing your body leveled up. 💖",
              },
              {
                keywords: ["jeans", "clothes", "tight", "fitting", "split", "pant", "size"],
                response: "When your femur bone grows 8 to 10 cm in a year, your wardrobe can't always keep up! Needing bigger clothes isn't a bad thing — it's proof your body is building its adult shape. 👖",
              },
              {
                keywords: ["leg", "legs", "ache", "aches", "growing", "pain", "night"],
                response: "Achy legs in the evening are super common during growth spurts! Gentle stretching, warm baths, and drinking water help relax your muscles as your bones grow. 🌙",
              },
              {
                keywords: ["hip", "hips", "thigh", "chest", "fat", "shape", "weight"],
                response: "During puberty, oestrogen tells your body to store soft energy in your hips and chest to create your adult structure. It's not bad weight — it's design! 🌸",
              },
            ],
            defaultResponse: "That's a thoughtful question! Every body grows on its own unique timeline. If you ever feel uncertain, a trusted adult, parent, or doctor can give you answers tailored to you. 🌟",
            conversationStarterOffer: "Want a gentle way to ask a parent or trusted adult about your body changes?",
            conversationStarters: [
              "\"Hey [Name], can I ask you a question about growth spurts and body changes?\"",
              "\"I was reading about how bones and skin stretch during puberty — did you get growing pains when you were my age?\"",
              "\"I noticed my clothes are fitting differently — could we go pick out some comfortable new sizes together?\"",
            ],
          },
        },

        // ── NODE 8 — FIXED END: Reflection Journal & Reward Ceremony ────────
        {
          nodeId: "gp_reflection_journal",
          type: "reflection_reward",
          position: "fixed_end",
          title: "Is My Body Failing... or Working? 🏆",
          estMinutes: 4,
          xpReward: 30,
          unlocksBadge: "growth_decoder",
          content: {
            moodQuestion: {
              prompt: "Before you finish — how do you feel about your body's growth right now?",
              options: [
                { emoji: "😌", label: "Relieved", gigiResponse: "That's wonderful! Realizing your body is working (not failing) makes all the difference. 💛" },
                { emoji: "🤔", label: "Curious", gigiResponse: "Curiosity is your superpower! Your body is a fascinating machine working on its own master design. 🌟" },
                { emoji: "💖", label: "Empowered", gigiResponse: "Yes! You now have the knowledge to wear your growth receipts with total pride! 👑" },
              ],
            },
            recapCards: [
              { emoji: "🦴", text: "Epiphyseal growth plates in your long bones can lengthen your height by 8–10 cm in a year!" },
              { emoji: "👖", text: "Split jeans and tight clothes mean your body is growing faster than your wardrobe can keep up." },
              { emoji: "🧬", text: "Stretch marks (striae) are collagen stretchy threads — receipts showing where your body grew." },
              { emoji: "🌸", text: "Oestrogen reshapes your hips, thighs, and chest to build your healthy adult structure." },
              { emoji: "✨", text: "Next time your body feels uncomfortable, remember: 'My body is working!'" },
            ],
            badge: {
              id: "growth_decoder",
              name: "Growth Decoder",
              emoji: "🧠✨",
              description: "Awarded for completing Episode 2: Growing Pains and unlocking the 'My Body Is Working' mindset!",
              totalPieces: 8,
            },
            closingMessage: {
              character: "Amara",
              text: "The next time something feels off, try this thought once: 'My body is working.' Not failing. Working. See you in the next episode!",
            },
            nextEpisode: {
              title: "Skin Stories",
              emoji: "🧴",
              teaser: "Oily skin, pimples, glow ups, and simple gentle skincare habits.",
            },
          },
        },
      ],
      totalXP: 175,
      isActive: true,
    },
    {
      id: "ce_skin_stories",
      journeyId: journey1.id,
      title: "3. Skin Stories",
      description: "Oily skin, pimples, glow ups, and simple gentle skincare habits.",
      episodeIcon: "🧴",
      order: 3,
      nodes: [],
      totalXP: 110,
      isActive: true,
    },
    {
      id: "ce_period_preview",
      journeyId: journey1.id,
      title: "4. The Period Preview",
      description: "Everything you need to know about what happens when your first period arrives.",
      episodeIcon: "🩸",
      order: 4,
      nodes: [],
      totalXP: 150,
      isActive: true,
    },
    {
      id: "ce_bra_basics",
      journeyId: journey1.id,
      title: "5. Bra Basics",
      description: "Finding the right fit, comfort, and feeling confident in your growing body.",
      episodeIcon: "👚",
      order: 5,
      nodes: [],
      totalXP: 100,
      isActive: true,
    },
    {
      id: "ce_body_image",
      journeyId: journey1.id,
      title: "6. Body Image Unlocked",
      description: "Loving your unique shape, building self-confidence, and busting social media comparison traps.",
      episodeIcon: "🪞",
      order: 6,
      nodes: [],
      totalXP: 130,
      isActive: true,
    },
  ];

  // Clean up obsolete episodes 7 & 8 if present
  await prisma.creativeEpisode.deleteMany({
    where: { id: { in: ["ce_hygiene_hero", "ce_masterclass"] } },
  });

  for (const ep of episodesList) {
    const created = await prisma.creativeEpisode.upsert({
      where: { id: ep.id },
      update: {
        title: ep.title,
        description: ep.description,
        episodeIcon: ep.episodeIcon,
        order: ep.order,
        nodes: ep.nodes as any,
        totalXP: ep.totalXP,
        totalCoins: (ep as any).totalCoins ?? 83,
      },
      create: {
        id: ep.id,
        journeyId: ep.journeyId,
        title: ep.title,
        description: ep.description,
        episodeIcon: ep.episodeIcon,
        order: ep.order,
        nodes: ep.nodes as any,
        totalXP: ep.totalXP,
        totalCoins: (ep as any).totalCoins ?? 83,
        unlockCondition: { type: ep.order === 1 ? "first_in_journey" : "previous_episode_completed" },
        isActive: true,
      },
    });
    console.log(`  └─ Episode ${created.order}: ${created.title}`);
  }

  // ── Episodes under "Period Diaries" (teaser) ──────────────────────────────
  const periodDiariesEpisode = await prisma.creativeEpisode.upsert({
    where: { id: "ce_cycle_basics" },
    update: {},
    create: {
      id: "ce_cycle_basics",
      journeyId: journey2.id,
      title: "1. What is a Cycle?",
      description: "Understanding the 4 phases of your monthly cycle.",
      episodeIcon: "🩸",
      order: 1,
      nodes: [],
      totalXP: 140,
      unlockCondition: { type: "first_in_journey" },
      isActive: true,
    },
  });

  console.log(`  └─ Episode ${periodDiariesEpisode.order}: ${periodDiariesEpisode.title}`);
  console.log("🎉 Creative Journey seed complete!");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
