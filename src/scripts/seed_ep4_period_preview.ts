/**
 * Seed script for Episode 4: The Period Preview (ce_period_preview)
 * Run: npx tsx src/scripts/seed_ep4_period_preview.ts
 */
import { prisma } from "../db/client.js";

const PERIOD_PREVIEW_NODES: any[] = [
  // ── NODE 1: Story — The Lion in the Classroom (fixed_start) ─────────────────
  {
    nodeId: "pp_story_1",
    type: "story",
    position: "fixed_start",
    title: "The Lion in the Classroom",
    estMinutes: 6,
    xpReward: 20,
    content: {
      pages: [
        {
          pageNumber: 1,
          title: "Last Period. No Teacher.",
          image: "assets/images/story/page_2.jpg",
          panels: [{
            id: "pp_p1_1",
            description: "Last period. No teacher. Absolute chaos. Chairs turned sideways. Someone had started a paper-ball match. Two girls were sharing chips under the desk like a secret mission.",
            dialogue: [{ character: "Narrator", type: "thought", text: "Which meant only one thing — absolute chaos." }]
          }]
        },
        {
          pageNumber: 2,
          title: "Something Felt Strange",
          image: "assets/images/story/page_3.jpg",
          panels: [{
            id: "pp_p1_2",
            description: "Meera sat with Nadia, laughing at something completely unimportant. And then — she froze. Something felt weird. A strange dampness. A discomfort she couldn't explain.",
            dialogue: [
              { character: "Nadia", type: "speech", text: "Why are you sitting like a robot?" },
              { character: "Meera", type: "speech", text: "I'm not." }
            ]
          }]
        },
        {
          pageNumber: 3,
          title: "Don't Move.",
          image: "assets/images/story/page_4.jpg",
          panels: [{
            id: "pp_p1_3",
            description: "Nadia leaned closer... then suddenly stopped. Her eyes widened.",
            dialogue: [
              { character: "Nadia", type: "whisper", text: "Meera…" },
              { character: "Meera", type: "speech", text: "What?" },
              { character: "Nadia", type: "whisper", text: "Don't move." },
              { character: "Nadia", type: "whisper", text: "…DON'T MOVE." }
            ]
          }]
        },
        {
          pageNumber: 4,
          title: "The Theories Begin",
          image: "assets/images/story/page_5.jpg",
          panels: [{
            id: "pp_p1_4",
            description: "Nadia lowered her voice dramatically. Meera's heart dropped.",
            dialogue: [
              { character: "Nadia", type: "thought", text: "I think… you're bleeding." },
              { character: "Meera", type: "speech", text: "WHAT?? How?? I didn't fall! I didn't hit anything!" },
              { character: "Nadia", type: "speech", text: "Okay listen… don't panic… this could be a curse." },
              { character: "Meera", type: "speech", text: "A WHAT??" }
            ]
          }]
        },
        {
          pageNumber: 5,
          title: "Ms. Kavya to the Rescue",
          image: "assets/images/story/page_6.jpg",
          panels: [{
            id: "pp_p1_5",
            description: "At the door stood Ms. Kavya, the physics teacher. Sharp eyes. Calm presence. She took one look at Meera, then at the stain, and her expression softened. She placed her dupatta gently around Meera's waist.",
            dialogue: [
              { character: "Ms. Kavya", type: "speech", text: "Nothing is wrong." },
              { character: "Ms. Kavya", type: "speech", text: "This is called your first period." }
            ]
          }]
        },
      ],
    },
  },

  // ── NODE 2: Story — The First Time ──────────────────────────────────────────
  {
    nodeId: "pp_story_2",
    type: "story",
    position: "random_pool",
    title: "The First Time",
    estMinutes: 7,
    xpReward: 20,
    content: {
      pages: [
        {
          pageNumber: 1,
          title: "The Walk to Safety",
          image: "assets/images/story/page_2.jpg",
          panels: [{
            id: "pp_p2_1",
            description: "The corridor felt quieter now. Or maybe Meera just couldn't hear anything properly. Ms. Kavya walked beside her. Calm. Unhurried. Nadia followed close behind, unusually silent for once.",
            dialogue: [{ character: "Meera", type: "thought", text: "For the first time since the chaos — I felt safe." }]
          }]
        },
        {
          pageNumber: 2,
          title: "The Washroom — Safe Space",
          image: "assets/images/story/page_3.jpg",
          panels: [{
            id: "pp_p2_2",
            description: "The washroom was clean, quiet, and empty. Ms. Kavya locked the door gently.",
            dialogue: [
              { character: "Ms. Kavya", type: "speech", text: "First things first — you're okay." },
              { character: "Meera", type: "speech", text: "…I'm not injured?" },
              { character: "Ms. Kavya", type: "speech", text: "No. You're not injured." },
              { character: "Nadia", type: "speech", text: "So… not a curse?" },
              { character: "Ms. Kavya", type: "speech", text: "…Definitely not." }
            ]
          }]
        },
        {
          pageNumber: 3,
          title: "The Science of It",
          image: "assets/images/story/page_4.jpg",
          panels: [{
            id: "pp_p2_3",
            description: "Ms. Kavya leaned against the sink and explained everything gently.",
            dialogue: [
              { character: "Ms. Kavya", type: "speech", text: "This is called menarche — your first menstrual cycle. Every month, your body builds a soft lining in your uterus. Think of it like preparing a room." },
              { character: "Nadia", type: "speech", text: "Guest room?" },
              { character: "Ms. Kavya", type: "speech", text: "Exactly. And if the guest doesn't arrive — the body cleans the room. That's the blood." }
            ]
          }]
        },
        {
          pageNumber: 4,
          title: "The Seniors Arrive",
          image: "assets/images/story/page_5.jpg",
          panels: [{
            id: "pp_p2_4",
            description: "A soft knock at the door. Two senior girls — Riya (Grade 10) and Ananya (Grade 9) — stood outside, calm and reassuring.",
            dialogue: [
              { character: "Riya", type: "speech", text: "Hey. I remember mine. I thought I was dying." },
              { character: "Ananya", type: "speech", text: "I cried for 20 minutes. Then ate chocolate. Then cried again." },
              { character: "Meera", type: "speech", text: "You were scared too?" },
              { character: "Riya", type: "speech", text: "Everyone is. The first time." }
            ]
          }]
        },
        {
          pageNumber: 5,
          title: "Not Scary Anymore",
          image: "assets/images/story/page_6.jpg",
          panels: [{
            id: "pp_p2_5",
            description: "Meera took a deep breath. The fear had faded. The confusion had softened. In its place — understanding.",
            dialogue: [
              { character: "Meera", type: "speech", text: "…So I'm normal?" },
              { character: "Ms. Kavya", type: "speech", text: "You are exactly where you're supposed to be." },
              { character: "Nadia", type: "speech", text: "I knew it wasn't a curse. …Okay fine, I thought it was a curse for 3 minutes." }
            ]
          }]
        },
      ],
    },
  },

  // ── NODE 3: Emoji Decoder — Meera's Panic Decoder (NEW) ────────────────────
  {
    nodeId: "pp_panic_decoder",
    type: "emoji_decoder",
    position: "random_pool",
    title: "Meera's Panic Decoder",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "Meera's Panic Decoder",
      instruction: "Read each moment from the story. Tap the emoji that best captures how Meera was feeling!",
      scenarios: [
        {
          id: "ed1",
          sceneEmoji: "😶",
          character: "Meera — In Class",
          scene: "Something felt weird. A strange dampness. A discomfort she couldn't explain. She shifted in her seat. Again.",
          options: ["😱", "😴", "😂", "🤔"],
          correctEmoji: "😱",
          gigiResponse: "Yes — that panicked confusion in the pit of your stomach. Your body just sent an unexpected signal with zero warning or explanation. Of course it felt terrifying!",
          wrongResponse: "Not quite — imagine something really unexpected happening to your body in a crowded classroom with zero warning. That's more than confusion or laughter!"
        },
        {
          id: "ed2",
          sceneEmoji: "🗣️",
          character: "Meera — Hearing Nadia's 'Curse' Theory",
          scene: "'This could be a curse. Or maybe you sat somewhere weird. Or maybe — WAIT — did you touch that broken swing??' Meera's breathing got faster.",
          options: ["😒", "😰", "🤣", "😤"],
          correctEmoji: "😰",
          gigiResponse: "Exactly — a mix of fear and disbelief. When you already don't know what's happening, hearing wild theories makes everything ten times scarier. Meera needed facts, not folklore!",
          wrongResponse: "Think about it — you're in a classroom, confused, and your friend is spinning increasingly wild theories. It's more fear than anything else!"
        },
        {
          id: "ed3",
          sceneEmoji: "👥",
          character: "Meera — When the Class Turned to Look",
          scene: "'Is she hurt?' 'Did someone push her?' 'Why is nobody doing anything??' Meera felt like the ground had disappeared. Her face burned.",
          options: ["😊", "😶", "😳", "😡"],
          correctEmoji: "😳",
          gigiResponse: "That burning embarrassment when a private moment suddenly becomes public — it's one of the most overwhelming feelings. Meera's reaction was completely human and completely understandable.",
          wrongResponse: "When the whole class suddenly turns to stare at your most private, unexpected moment — that's a very specific feeling. Overwhelmed embarrassment, not calm or anger."
        },
        {
          id: "ed4",
          sceneEmoji: "🚿",
          character: "Meera — After Ms. Kavya Explained Everything",
          scene: "'You are exactly where you're supposed to be.' Meera took a deep breath. The fear had faded. The confusion had softened. In its place — understanding.",
          options: ["😢", "😌", "😠", "😐"],
          correctEmoji: "😌",
          gigiResponse: "That quiet, warm relief when chaos finally makes sense. Understanding replaces fear every single time. That's the power of good information given with kindness.",
          wrongResponse: "This is the end of the story — after everything got explained with care and compassion. The fear is gone, the confusion has softened. It's a gentler emotion now."
        },
      ],
    },
  },

  // ── NODE 4: Mystery Task Box — Period Prep Kit ──────────────────────────────
  {
    nodeId: "pp_period_kit",
    type: "mystery_task_box",
    position: "random_pool",
    title: "Period Prep Kit",
    estMinutes: 4,
    xpReward: 20,
    content: {
      flaps: [
        {
          id: 1,
          type: "fact_task",
          factText: "A sanitary pad sticks to the inside of your underwear and absorbs menstrual blood. Most pads have a sticky strip on the back and wings that fold under your underwear for extra security. You should change it every 4-6 hours.",
          task: {
            question: "How often should you ideally change a sanitary pad to stay comfortable and hygienic?",
            options: ["Every 1 hour", "Every 4-6 hours", "Only when it feels full", "Once a day"],
            correctIndex: 1,
            feedbackText: "Every 4-6 hours is ideal — or sooner if your flow is heavier. Regular changing keeps you comfortable and prevents leaks!"
          }
        },
        {
          id: 2,
          type: "mini_task",
          prompt: "Meera is packing a small emergency period kit for her school bag. Which 3 things should definitely be in it?",
          options: [
            { label: "A spare sanitary pad (or 2)", emoji: "🩹" },
            { label: "A small pouch/zip bag", emoji: "👜" },
            { label: "A spare pair of underwear", emoji: "👙" },
            { label: "Three different face serums", emoji: "🧪" },
            { label: "An entire chemistry textbook", emoji: "📚" },
          ],
          correctIndices: [0, 1, 2],
          feedbackText: "A pad, a small pouch to carry it discreetly, and a spare pair of underwear — that's the essential emergency trio! Simple, practical, and confidence-boosting."
        },
        {
          id: 3,
          type: "fact_reflection",
          factText: "Period cramps (called dysmenorrhoea) happen because your uterus contracts to shed its lining. A warm water bottle on your lower abdomen, light movement, and staying hydrated can all help reduce discomfort significantly.",
          reflectionPrompt: "Now you know period cramps have a real biological cause — not weakness. How does understanding the 'why' make you feel?",
          emojiOptions: ["😌 Relieved", "💪 Stronger", "🤔 Still curious"],
          isPrivate: true,
          feedbackText: "Knowing that cramps are just your body doing its job — not something random or wrong — changes everything. Biology, not weakness!"
        },
        {
          id: 4,
          type: "sticker_reward",
          message: "You cracked open the Period Prep Kit! Here's your Period-Ready sticker! 🩸",
          stickerEmoji: "🩸✨"
        },
      ],
    },
  },

  // ── NODE 5: Quiz — Period Science Quiz ─────────────────────────────────────
  {
    nodeId: "pp_quiz",
    type: "quiz",
    position: "random_pool",
    title: "Period Science Quiz",
    estMinutes: 5,
    xpReward: 25,
    passThreshold: 0.6,
    content: {
      questions: [
        {
          id: "pq1",
          text: "What is the medical term for a girl's FIRST period?",
          options: ["Menopause", "Menarche", "Ovulation", "Menstruation"],
          correctIndex: 1,
          feedback: "Menarche (meh-NAR-kee) is the medical term for the first menstrual period. It's a normal part of puberty — not a medical emergency!"
        },
        {
          id: "pq2",
          text: "Ms. Kavya compared the uterus lining to 'preparing a room.' What is the 'guest' that might arrive?",
          options: ["A blood clot", "A fertilised egg", "A hormone", "A new organ"],
          correctIndex: 1,
          feedback: "The uterus prepares a soft, nourishing lining in case a fertilised egg arrives. If it doesn't, the lining sheds — that's your period. Menarche biology, beautifully explained!"
        },
        {
          id: "pq3",
          text: "How long does a typical menstrual cycle last?",
          options: ["7 days exactly", "14 days", "Around 28 days (but can vary)", "60 days"],
          correctIndex: 2,
          feedback: "The average cycle is around 28 days — but cycles can range from 21 to 35 days and still be perfectly normal. Bodies vary!"
        },
        {
          id: "pq4",
          text: "Nadia had several theories for Meera's period — curse, broken swing, angry God. What ACTUALLY causes a period?",
          options: ["Eating too many sweets", "The monthly shedding of the uterus lining", "An injury inside the body", "Sitting in the wrong place"],
          correctIndex: 1,
          feedback: "Monthly shedding of the uterus lining — regulated by hormones, not by swings, curses, or sweets! Nadia's theories were creative but scientifically zero marks!"
        },
        {
          id: "pq5",
          text: "Period cramps happen because:",
          options: ["Something is going wrong in the body", "The uterus is contracting to shed its lining", "You ate something bad", "You didn't exercise enough"],
          correctIndex: 1,
          feedback: "Cramps are caused by uterine contractions — your body's way of shedding the lining efficiently. Completely biological, not a sign that anything is wrong!"
        },
        {
          id: "pq6",
          text: "What is the most important thing Meera learned at the end of the story?",
          options: ["She should avoid the broken swing forever", "Her period was caused by fighting with her parents", "Understanding her body removes fear — what feels scary is just something no one explained yet", "She should never sit in a noisy classroom again"],
          correctIndex: 2,
          feedback: "The most powerful lesson: sometimes the scariest moments are just things no one has explained to you yet. Knowledge replaces fear, every time."
        },
      ],
    },
  },

  // ── NODE 6: Myth Busters — Period Myth Smashers ─────────────────────────────
  {
    nodeId: "pp_mythbusters",
    type: "myth_busters",
    position: "random_pool",
    title: "Period Myth Smashers",
    estMinutes: 4,
    xpReward: 20,
    content: {
      instruction: "Swipe RIGHT for TRUE, swipe LEFT for MYTH",
      cards: [
        {
          id: "pm1",
          statement: "Your first period means something is medically wrong with you.",
          verdict: "MYTH",
          explanation: "Myth! Your first period (menarche) is a completely normal part of puberty. It means your body is growing exactly as it should — nothing is wrong!"
        },
        {
          id: "pm2",
          statement: "Periods can be irregular when they first start — and that's normal.",
          verdict: "TRUE",
          explanation: "True! It can take 1-2 years for a period cycle to become regular after menarche. Irregular cycles in the beginning are completely expected!"
        },
        {
          id: "pm3",
          statement: "You should avoid swimming, sports, or exercise during your period.",
          verdict: "MYTH",
          explanation: "Myth! Light exercise can actually reduce cramps by releasing endorphins. There are no activities you 'must' avoid — listen to your body!"
        },
        {
          id: "pm4",
          statement: "A heating pad or warm water bottle can help reduce period cramps.",
          verdict: "TRUE",
          explanation: "True! Warmth on your lower abdomen relaxes uterine muscles, reducing cramping. A classic, evidence-backed comfort hack!"
        },
        {
          id: "pm5",
          statement: "Period blood is 'dirty' or 'contaminated' blood.",
          verdict: "MYTH",
          explanation: "Myth! Menstrual blood is a mix of blood, uterine lining tissue, and fluid — it's not dirty or toxic. It's completely natural biological material."
        },
        {
          id: "pm6",
          statement: "It's completely normal to talk to a trusted adult when you get your first period.",
          verdict: "TRUE",
          explanation: "True! Ms. Kavya, Riya, and Ananya all showed us — talking to a trusted adult about your period is the BEST thing you can do. You deserve support!"
        },
        {
          id: "pm7",
          statement: "Getting your period means you can now get pregnant — so you should be educated about reproductive health.",
          verdict: "TRUE",
          explanation: "True! Understanding your body, cycle, and reproductive health is important knowledge — not something to be embarrassed about. Being informed is empowering!"
        },
      ],
    },
  },

  // ── NODE 7: Match Pairs — Pad & Product Matcher (NEW) ──────────────────────
  {
    nodeId: "pp_pad_guide",
    type: "match_pairs",
    position: "random_pool",
    title: "Pad & Product Matcher",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "Pad & Product Matcher",
      instruction: "Tap a card, then tap its matching card! Match each period product to its description.",
      completionMessage: "You matched them all! Now you know exactly what each period product does — no more confusion in the chemist aisle!",
      pairs: [
        {
          id: "mp1",
          emoji: "🌸",
          term: "Regular Pad",
          definition: "Sticks to underwear, absorbs flow for 4–6 hours, best for everyday use"
        },
        {
          id: "mp2",
          emoji: "🌙",
          term: "Night Pad",
          definition: "Longer and wider for overnight protection, prevents leaks while sleeping"
        },
        {
          id: "mp3",
          emoji: "🧵",
          term: "Tampon",
          definition: "Inserted inside the body, absorbs flow internally, changed every 4–8 hours"
        },
        {
          id: "mp4",
          emoji: "🍷",
          term: "Menstrual Cup",
          definition: "Reusable silicone cup inserted to collect (not absorb) menstrual flow"
        },
        {
          id: "mp5",
          emoji: "👙",
          term: "Period Underwear",
          definition: "Reusable, absorbent underwear that replaces or backs up other products"
        },
        {
          id: "mp6",
          emoji: "🩸",
          term: "Panty Liner",
          definition: "Thin, light pad for spotting, discharge, or as backup protection"
        },
      ],
    },
  },

  // ── NODE 8: Drag to Label — Map Your Cycle (NEW) ───────────────────────────
  {
    nodeId: "pp_cycle_map",
    type: "drag_to_label",
    position: "random_pool",
    title: "Map Your Cycle",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "Map Your Cycle",
      instruction: "Drag each phase label onto the correct zone of your menstrual cycle. Learn what your body does each month!",
      targets: [
        {
          id: "cm1",
          emoji: "🩸",
          label: "Period",
          correctZone: "zone_1",
          description: "The uterus sheds its lining. Meera's story begins right here! Bleeding lasts 3–7 days, and cramps may happen as the uterus contracts."
        },
        {
          id: "cm2",
          emoji: "🌱",
          label: "Follicular Phase",
          correctZone: "zone_2",
          description: "Your body produces oestrogen, preparing a new egg. Energy rises, mood lifts. This is the 'building up' phase — your body getting ready."
        },
        {
          id: "cm3",
          emoji: "🥚",
          label: "Ovulation",
          correctZone: "zone_3",
          description: "A mature egg is released from the ovary. The 'guest' Ms. Kavya mentioned! If a sperm doesn't arrive, the cycle moves on to the next phase."
        },
        {
          id: "cm4",
          emoji: "🌙",
          label: "Luteal Phase",
          correctZone: "zone_4",
          description: "The body prepares for potential pregnancy. Progesterone rises. If pregnancy doesn't occur, hormone levels drop — triggering the next period."
        },
      ],
    },
  },

  // ── NODE 9: Scenario Choice — What Would You Say? (NEW) ────────────────────
  {
    nodeId: "pp_scenario_choice",
    type: "scenario_choice",
    position: "random_pool",
    title: "What Would You Say?",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "What Would You Say?",
      instruction: "Step into Nadia's shoes. Choose how you'd respond to your friend Meera in each moment.",
      scenarios: [
        {
          id: "sc1",
          situationEmoji: "😶",
          rolePrompt: "You are Nadia. What do you say FIRST?",
          situation: "You notice something on Meera's skirt and realise she might have gotten her period. The whole class is starting to stare. Meera looks terrified.",
          choices: [
            {
              text: "Whisper calmly: 'Hey, take my jacket — tie it around your waist. Let's just go to the washroom quietly together.'",
              isBest: true,
              gigiResponse: "This is the most supportive response — you protect her dignity, act fast, and stay calm. A true friend doesn't make the moment bigger, they make it safer."
            },
            {
              text: "Loudly announce to the class: 'IT'S FINE, she just got her PERIOD, everyone back off!'",
              isBest: false,
              gigiResponse: "Your heart's in the right place, but this removes Meera's choice about who knows. In a vulnerable moment, the quieter, kinder path protects her dignity more."
            },
            {
              text: "Freeze and do nothing because you don't know what to do.",
              isBest: false,
              gigiResponse: "Freezing is a very human response — but even a small action helps. A jacket tied around the waist, a quiet 'let's go' — that's enough to change everything."
            }
          ]
        },
        {
          id: "sc2",
          situationEmoji: "🚿",
          rolePrompt: "You are Nadia. In the washroom now.",
          situation: "Meera is still shaking, and Ms. Kavya has explained what a period is. Meera quietly says, 'I'm so embarrassed. I wish it hadn't happened in class.'",
          choices: [
            {
              text: "'Honestly? It could have happened to anyone. It happened to you — and you handled it way better than I would have.'",
              isBest: true,
              gigiResponse: "Validation without minimising — you acknowledge her feelings AND remind her of her own strength. That's the kind of response that stays with someone."
            },
            {
              text: "'Don't be embarrassed! It's nothing! Just forget about it!'",
              isBest: false,
              gigiResponse: "Telling someone not to feel what they're feeling — even kindly — can feel dismissive. Acknowledging the feeling first ('I get why that felt awful') is more powerful."
            },
            {
              text: "'Same thing happened to my cousin. But way worse. She was in a—' [proceeds to tell a 10-minute story about someone else]",
              isBest: false,
              gigiResponse: "Sometimes we try to help by sharing other people's stories — but in that moment, Meera needs to feel heard, not redirected to someone else's experience. Stay with her."
            }
          ]
        },
        {
          id: "sc3",
          situationEmoji: "🏫",
          rolePrompt: "You are Nadia. Back in school next week.",
          situation: "A few classmates who saw what happened are whispering and giggling about it. You hear one of them say 'Did you see what happened to Meera last week?'",
          choices: [
            {
              text: "Walk over and say calmly: 'That's actually just a period — pretty normal thing. Not really something to gossip about.'",
              isBest: true,
              gigiResponse: "Calm, factual, and non-confrontational — you normalise periods AND protect your friend without making it a drama. This is the right amount of brave."
            },
            {
              text: "Ignore it and hope Meera doesn't find out they were talking about her.",
              isBest: false,
              gigiResponse: "Staying silent when someone is being gossiped about can feel easier — but Meera's trust in you grows when she knows you spoke up. Silence can feel like agreement."
            },
            {
              text: "Get very angry and shout at them in front of everyone.",
              isBest: false,
              gigiResponse: "The protective instinct is beautiful — but escalating the situation can draw more attention to Meera, not less. A calm, firm response is usually more effective than a loud one."
            }
          ]
        },
      ],
    },
  },

  // ── NODE 10: Reflection Reward — Period Preview Complete (fixed_end) ─────────
  {
    nodeId: "pp_reflection",
    type: "reflection_reward",
    position: "fixed_end",
    title: "Period Preview: Complete",
    xpReward: 30,
    unlocksBadge: "period_ready",
    content: {
      moodQuestion: {
        prompt: "Before you go — how do you feel about periods and your body's cycle now?",
        options: [
          { emoji: "😌", label: "Relieved", gigiResponse: "That relief makes so much sense. Meera felt it too — the moment someone explained it with kindness. You have the knowledge now. The fear has nowhere left to live." },
          { emoji: "💪", label: "Empowered", gigiResponse: "Yes! Understanding your own cycle is one of the most empowering things you can do. Meera started terrified and ended with strength — and so do you." },
          { emoji: "🤔", label: "Still curious", gigiResponse: "Stay curious — that's how understanding grows. Every question you have is worth asking. Gigi is always here, and so are the trusted adults in your life." },
          { emoji: "💛", label: "Grateful for Meera's story", gigiResponse: "Stories make science feel human. Meera's panic, Nadia's wild theories, Ms. Kavya's calm — they made this real. Carry that warmth with you." },
        ],
      },
      recapCards: [
        { emoji: "🩸", text: "Your first period is called menarche — a completely normal part of puberty, not a medical emergency." },
        { emoji: "🏠", text: "Your uterus builds a soft lining each month ('the guest room'). When no fertilised egg arrives, the lining sheds — that's your period." },
        { emoji: "📅", text: "A menstrual cycle is around 28 days (but 21–35 days is normal). Irregular cycles are expected when periods first begin." },
        { emoji: "🩹", text: "Sanitary pads, tampons, menstrual cups, and period underwear are all valid options. Change your pad every 4–6 hours." },
        { emoji: "💛", text: "Period cramps are caused by uterine contractions — not weakness. Warmth, hydration, and light movement can help." },
        { emoji: "🌸", text: "What feels scary is usually just something no one has explained yet. Knowledge replaces fear, every single time." },
      ],
      badge: {
        id: "period_ready",
        name: "Period Ready",
        emoji: "🩸",
        description: "Awarded for completing Episode 4: The Period Preview — and understanding your cycle with science, not myths!",
        totalPieces: 10,
      },
      closingMessage: {
        character: "Meera",
        text: "If I could go back to that classroom — I'd still be scared. But I'd also know: there's nothing wrong with me. This is just my body, doing something powerful. I hope you know that too.",
      },
      nextEpisode: {
        title: "Bra Basics",
        emoji: "👚",
        teaser: "Finding the right fit, comfort, and feeling confident in your growing body.",
      },
    },
  },
];

async function seed() {
  console.log("🩸 Seeding Episode 4: The Period Preview (ce_period_preview)...");
  const updated = await prisma.creativeEpisode.update({
    where: { id: "ce_period_preview" },
    data: {
      title: "4. The Period Preview",
      description: "Everything you need to know about what happens when your first period arrives — told through Meera's story of panic, laughter, and understanding.",
      episodeIcon: "🩸",
      order: 4,
      nodes: PERIOD_PREVIEW_NODES as any,
      totalXP: 210,
      isActive: true,
    },
  });
  console.log(`✅ Episode 4 seeded: "${updated.title}" with ${PERIOD_PREVIEW_NODES.length} nodes & ${updated.totalXP} total XP`);
  console.log("  Nodes seeded:");
  PERIOD_PREVIEW_NODES.forEach((n: any, i: number) => {
    console.log(`  ${i + 1}. [${n.type}] ${n.title} (+${n.xpReward} XP)`);
  });
}

seed()
  .catch((e) => {
    console.error("❌ Episode 4 seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
