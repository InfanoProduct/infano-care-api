/**
 * Seed script for Episode 3: Skin Stories (ce_skin_stories)
 * Run: npx tsx src/scripts/seed_ep3_skin_stories.ts
 */
import { prisma } from "../db/client.js";

const SKIN_STORIES_NODES: any[] = [
  {
    nodeId: "ss_story_1",
    type: "story",
    position: "fixed_start",
    title: "The Selfie Dilemma",
    estMinutes: 5,
    xpReward: 20,
    content: {
      pages: [
        { pageNumber: 1, title: "The Honest Mirror", image: "assets/images/story/page_2.jpg", panels: [{ id: "ss_p1_1", description: "The bathroom light was too honest. It showed everything — every tiny bump, every new spot that hadn't been there last week.", dialogue: [{ character: "Amara", type: "thought", text: "I researched everything. I read reviews. I compared ingredients. I even made a spreadsheet." }] }] },
        { pageNumber: 2, title: "The Rs.2500 Shelf", image: "assets/images/story/page_3.jpg", panels: [{ id: "ss_p2_1", description: "Behind her, the shelf told a different story. A cleanser. A toner. Two serums. A moisturizer. A face mask. A spot treatment. A small receipt peeked out — Rs.2500.", dialogue: [{ character: "Amara", type: "speech", text: "And it still didn't work." }] }] },
        { pageNumber: 3, title: "The Unfiltered Post", image: "assets/images/story/page_4.jpg", panels: [{ id: "ss_p3_1", description: "Almost automatically, she picked up her phone. Click. A photo. Not perfect. Not filtered. Just real. She hesitated — then posted it.", dialogue: [{ character: "Amara", type: "thought", text: "Seconds passed. A few likes. A heart emoji. Then a comment. Some kind. Some... not." }] }] },
        { pageNumber: 4, title: "The Spiral", image: "assets/images/story/page_5.jpg", panels: [{ id: "ss_p4_1", description: "Amara's thumb hovered over the screen. She closed the app. Opened it again. Closed it. Opened it again.", dialogue: [{ character: "Amara", type: "speech", text: "Why do we do this to ourselves?" }] }] },
        { pageNumber: 5, title: "The Better Question", image: "assets/images/story/page_6.jpg", panels: [{ id: "ss_p5_1", description: "She placed the phone face down. Silence returned. But the question didn't leave.", dialogue: [{ character: "Amara", type: "thought", text: "If I did everything right... then why isn't it working? What if the problem... wasn't my skin?" }] }] },
      ],
    },
  },
  {
    nodeId: "ss_story_2",
    type: "story",
    position: "random_pool",
    title: "It Was Never About the Mirror",
    estMinutes: 6,
    xpReward: 20,
    content: {
      pages: [
        { pageNumber: 1, title: "Dr. Bloom's Clinic", image: "assets/images/story/page_2.jpg", panels: [{ id: "ss2_p1_1", description: "Two days later. A small clinic that smelled faintly of antiseptic and coffee. Dr. Bloom was sitting slightly sideways — like this was just a conversation, not a diagnosis.", dialogue: [{ character: "Amara", type: "speech", text: "My routine costs Rs.2500. I researched every product. I followed every step. And it. Has. Not. Worked. What am I doing wrong?" }] }] },
        { pageNumber: 2, title: "The Diagram", image: "assets/images/story/page_3.jpg", panels: [{ id: "ss2_p2_1", description: "Dr. Bloom turned a tablet toward Amara. On the screen — an illustration. Warm tones. Layers of skin, softly drawn.", dialogue: [{ character: "Dr. Bloom", type: "speech", text: "Your skin produces something called sebum. Oil. Completely normal. Completely necessary." }, { character: "Amara", type: "speech", text: "...Oil is necessary?" }] }] },
        { pageNumber: 3, title: "How a Pimple Forms", image: "assets/images/story/page_4.jpg", panels: [{ id: "ss2_p3_1", description: "Dr. Bloom tapped the screen — a tiny gland, little amber droplets forming, filling a pore.", dialogue: [{ character: "Dr. Bloom", type: "speech", text: "During puberty, hormones tell your sebaceous glands to produce more oil. More chance of pores getting blocked. Bacteria grow inside. Your immune system reacts. And that... is a pimple." }] }] },
        { pageNumber: 4, title: "The Line That Landed", image: "assets/images/story/page_5.jpg", panels: [{ id: "ss2_p4_1", description: "Amara stared at the screen. Then at her own reflection in the black screen of her phone.", dialogue: [{ character: "Amara", type: "speech", text: "So... this isn't because I'm doing something wrong?" }, { character: "Dr. Bloom", type: "speech", text: "Not because you're dirty. Not because of chocolate. Not because you touched your face once. This is biology." }] }] },
        { pageNumber: 5, title: "Less is More", image: "assets/images/story/page_6.jpg", panels: [{ id: "ss2_p5_1", description: "Amara slowly thought about her shelf. The toner. The serum. The other serum.", dialogue: [{ character: "Dr. Bloom", type: "speech", text: "The most common mistake? Over-treatment. Too many acids. Too many products. Teenage skin is already sensitive, already reactive." }, { character: "Dr. Bloom", type: "speech", text: "A gentle cleanser. A simple moisturiser. SPF every day. And the hardest one — not picking." }] }] },
        { pageNumber: 6, title: "Rs.300 vs Rs.2500", image: "assets/images/story/page_2.jpg", panels: [{ id: "ss2_p6_1", description: "That evening, Amara stood in front of her shelf again. Same products. Very different perspective.", dialogue: [{ character: "Dr. Bloom", type: "speech", text: "The evidence-based version costs about Rs.300-400 a month." }, { character: "Amara", type: "thought", text: "My spreadsheet is... crying. SPF — you were the main character all along." }] }] },
      ],
    },
  },
  {
    nodeId: "ss_skin_lab",
    type: "mystery_task_box",
    position: "random_pool",
    title: "Skin Lab Mystery Box",
    estMinutes: 3,
    xpReward: 20,
    content: {
      flaps: [
        { id: 1, type: "fact_task", factText: "Sebaceous glands produce sebum — an oily substance that protects and moisturises your skin. During puberty, hormones called androgens tell these glands to produce MORE sebum than usual!", task: { question: "Which hormone type triggers your skin glands to produce more oil during puberty?", options: ["Melatonin", "Androgens", "Insulin", "Adrenaline"], correctIndex: 1, feedbackText: "Androgens are the hormones that rev up your sebaceous glands! They explain why teenage skin gets oilier." } },
        { id: 2, type: "mini_task", prompt: "Look at these skincare steps — which 3 are actually evidence-based for teenage skin?", options: [{ label: "Gentle cleanser (twice a day)", emoji: "🧴" }, { label: "Simple moisturiser", emoji: "💧" }, { label: "SPF (every single day)", emoji: "☀️" }, { label: "3 different serums", emoji: "🧪" }, { label: "Aggressive exfoliating acid toner daily", emoji: "⚗️" }], correctIndices: [0, 1, 2], feedbackText: "The evidence-based trio: gentle cleanser + moisturiser + SPF. Simple, affordable, and scientifically backed!" },
        { id: 3, type: "fact_reflection", factText: "Sweat itself has no odour! Body odour is caused by bacteria on your skin breaking down apocrine sweat (which activates during puberty). Antiperspirants and deodorants target these bacteria.", reflectionPrompt: "Did you know sweat itself is odourless? How does that make you feel?", emojiOptions: ["😲 Mind = Blown!", "😌 Actually relieved", "🤷 Interesting..."], isPrivate: true, feedbackText: "Biology, not embarrassment! Now you know the real science behind body odour — and how to manage it without stress." },
        { id: 4, type: "sticker_reward", message: "You cracked open the Skin Lab! Here's your Skin Scientist sticker!", stickerEmoji: "🧬✨" },
      ],
    },
  },
  {
    nodeId: "ss_quiz",
    type: "quiz",
    position: "random_pool",
    title: "Skin Science Quiz",
    estMinutes: 5,
    xpReward: 25,
    passThreshold: 0.6,
    content: {
      questions: [
        { id: "sq1", text: "What is the main function of sebum produced by your skin?", options: ["To cause pimples", "To protect and moisturise the skin", "To make your skin shiny for no reason", "To attract bacteria"], correctIndex: 1, feedback: "Sebum is your skin's natural protective oil — it just gets over-produced during puberty because of hormones!" },
        { id: "sq2", text: "Amara spent Rs.2500 on skincare but her skin didn't improve. The most likely reason is:", options: ["She didn't research enough", "Her skin type is broken", "Too many products overwhelmed her sensitive teenage skin", "She needed even more products"], correctIndex: 2, feedback: "Over-treatment is super common! Teenage skin is sensitive and often reacts poorly to too many active ingredients." },
        { id: "sq3", text: "A pimple forms when:", options: ["You eat too much chocolate", "A pore gets blocked, bacteria grow inside, and your immune system reacts", "You don't wash your face for a week", "You touch your face once"], correctIndex: 1, feedback: "It's a biological sequence — blocked pore, then bacteria, then immune reaction. Not a punishment!" },
        { id: "sq4", text: "Which of these is the most important skincare product for daytime protection?", options: ["An expensive vitamin C serum", "A spot treatment cream", "SPF (Sunscreen)", "A hydrating face mist"], correctIndex: 2, feedback: "SPF every day protects against UV damage, hyperpigmentation, and premature aging. Dr. Bloom would approve!" },
        { id: "sq5", text: "Body odour during puberty is mainly caused by:", options: ["Sweat alone", "Eating certain foods", "Bacteria on skin breaking down apocrine sweat", "Poor hygiene only"], correctIndex: 2, feedback: "Sweat itself is odourless! It's the bacteria on your skin doing the breaking-down work. Biology, not embarrassment!" },
        { id: "sq6", text: "What did Dr. Bloom recommend as the evidence-based skincare routine for teenagers?", options: ["8-step Korean skincare routine", "Gentle cleanser + moisturiser + SPF", "Toner + 3 serums + exfoliator", "Just water, no products needed"], correctIndex: 1, feedback: "Simple, gentle, effective — and costs about Rs.300-400 a month. Your skin doesn't need a spreadsheet!" },
      ],
    },
  },
  {
    nodeId: "ss_mythbusters",
    type: "myth_busters",
    position: "random_pool",
    title: "Skincare Myth Smashers",
    estMinutes: 4,
    xpReward: 20,
    content: {
      instruction: "Swipe RIGHT for TRUE, swipe LEFT for MYTH",
      cards: [
        { id: "sm1", statement: "Eating chocolate or oily food directly causes pimples.", verdict: "MYTH", explanation: "Myth! Pimples form from blocked pores and bacteria — not from what you eat. There's no universal food-acne link!" },
        { id: "sm2", statement: "Washing your face 5-6 times a day will reduce acne faster.", verdict: "MYTH", explanation: "Myth! Over-washing strips your skin's protective barrier, triggering it to produce even MORE sebum. Twice a day is all you need!" },
        { id: "sm3", statement: "SPF is the most important skincare product for everyday use.", verdict: "TRUE", explanation: "True! UV radiation is the #1 cause of premature aging, hyperpigmentation, and skin damage. SPF wins every single day!" },
        { id: "sm4", statement: "Picking or popping pimples helps them heal faster.", verdict: "MYTH", explanation: "Myth! Picking spreads bacteria, causes deeper inflammation, and can lead to permanent scarring. The hardest rule — but the most important!" },
        { id: "sm5", statement: "Teenage skin is naturally more sensitive and reactive than adult skin.", verdict: "TRUE", explanation: "True! Adult skincare products are often too strong for teenage skin. Using too many strong actives often makes things worse." },
        { id: "sm6", statement: "Body hair growth during puberty is mostly determined by genetics.", verdict: "TRUE", explanation: "True! The amount, texture, and color of body hair is mostly genetic. Comparing yours to anyone else's is completely pointless!" },
        { id: "sm7", statement: "You HAVE to remove body hair to be considered hygienic.", verdict: "MYTH", explanation: "Myth! Body hair has zero impact on hygiene. What you do with your body hair is a personal choice — all options are valid." },
      ],
    },
  },
  {
    nodeId: "ss_ingredient_detective",
    type: "timeline_builder",
    position: "random_pool",
    title: "The Ingredient Detective",
    estMinutes: 4,
    xpReward: 20,
    content: {
      instruction: "Amara is building her evidence-based skincare shelf. Drag and drop the steps in the order she should apply them each morning!",
      cards: [
        { id: "id1", emoji: "🫧", label: "Gentle cleanser — remove overnight oil and impurities" },
        { id: "id2", emoji: "💧", label: "Simple moisturiser — hydrate and protect skin barrier" },
        { id: "id3", emoji: "☀️", label: "SPF — shield from UV damage (non-negotiable!)" },
        { id: "id4", emoji: "🚫", label: "Spot treatment — only on active pimples if needed" },
        { id: "id5", emoji: "🛌", label: "Night: gentle cleanser + moisturiser only" },
      ],
      revealMessage: "You built Amara's evidence-based routine! Cleanser, Moisturiser, SPF (morning). That's it. That's the whole science. The spreadsheet was holding her back — simplicity is the upgrade!",
    },
  },
  {
    nodeId: "ss_routine_audit",
    type: "spot_the_change",
    position: "random_pool",
    title: "Routine Audit",
    estMinutes: 3,
    xpReward: 20,
    content: {
      instruction: "Amara is auditing her shelf. Tap the 5 products that Dr. Bloom would say are NOT evidence-based for teenage skin!",
      character: "Amara's Shelf",
      differences: [
        { id: "ra1", emoji: "⚗️", label: "High-strength acid toner", hint: "Too harsh for sensitive teenage skin — strips protective barrier" },
        { id: "ra2", emoji: "🧪", label: "Vitamin C serum (adult formula)", hint: "Often too concentrated for reactive teenage skin" },
        { id: "ra3", emoji: "🌿", label: "Retinol night cream", hint: "A powerful anti-aging ingredient — not designed for teenage use" },
        { id: "ra4", emoji: "💊", label: "Supplement pill for clear skin", hint: "No solid clinical evidence for healthy teens with normal diet" },
        { id: "ra5", emoji: "🧖", label: "Weekly exfoliating face scrub", hint: "Too abrasive — micro-tears in skin make acne worse not better" },
      ],
      completionMessage: "Audit complete! Amara's shelf just got Rs.2100 lighter and evidence-based! Remember: gentle cleanser + moisturiser + SPF is the real glow-up formula.",
    },
  },
  {
    nodeId: "ss_identify",
    type: "identify_image",
    position: "random_pool",
    title: "Spot What's Actually True",
    estMinutes: 3,
    xpReward: 15,
    content: {
      instruction: "Tap ALL the statements that are scientifically accurate about teen skin and body changes.",
      icons: [
        { id: "i1", emoji: "🌙", label: "Pimples are caused by biology, not bad hygiene", isCorrect: true },
        { id: "i2", emoji: "🧴", label: "More products = better skin results", isCorrect: false, distractorNote: "Actually the opposite — over-treatment is one of the top causes of irritated teenage skin!" },
        { id: "i3", emoji: "☀️", label: "SPF protects skin every day, even when it's cloudy", isCorrect: true },
        { id: "i4", emoji: "🦠", label: "Bacteria + blocked pores = a pimple", isCorrect: true },
        { id: "i5", emoji: "💇", label: "You must remove body hair to be hygienic", isCorrect: false, distractorNote: "Body hair is natural — what you choose to do with it is 100% your personal decision!" },
        { id: "i6", emoji: "💧", label: "Sweat itself has no odour — bacteria cause the smell", isCorrect: true },
        { id: "i7", emoji: "🍫", label: "Chocolate directly causes acne breakouts", isCorrect: false, distractorNote: "No direct causal link — pimples form from blocked pores and hormones, not specifically from food!" },
        { id: "i8", emoji: "🧬", label: "Body hair amount and texture is mostly genetic", isCorrect: true },
      ],
      completionMessage: "Science detective work complete! You know the truth about teen skin now — and that's worth more than any spreadsheet.",
    },
  },
  {
    nodeId: "ss_ask_gigi",
    type: "anonymous_question_box",
    position: "random_pool",
    title: "Ask Gigi: Skin Edition",
    estMinutes: 3,
    xpReward: 15,
    content: {
      prompt: "Got a question about acne, oily skin, body hair, or body odour? Ask Gigi — anonymously and without judgment.",
      placeholder: "What's on your skin's mind?",
      privacyNote: "Your words are private. Only you (and a trusted parent/guardian) can see what you write here.",
      keywordResponses: [
        { keywords: ["pimple", "pimples", "acne", "breakout", "spot", "spots", "zit"], response: "Pimples are caused by biology — your sebaceous glands producing more oil during puberty, combined with bacteria. You didn't do anything wrong! A gentle cleanser, moisturiser, and SPF (plus not picking!) is the evidence-based approach. A doctor or dermatologist can help if it's severe." },
        { keywords: ["oily", "oil", "greasy", "sebum", "shiny"], response: "Oily skin during puberty is normal — your sebaceous glands are responding to hormones. Washing more than twice a day actually makes it worse by triggering more oil production! A gentle cleanser and lightweight moisturiser are your best friends." },
        { keywords: ["hair", "body hair", "shave", "wax", "remove", "underarm", "leg hair"], response: "Body hair during puberty is completely normal — controlled by the same androgens that affect your skin. What you do with it is your personal choice: remove it, keep it, or ignore it. All options are valid." },
        { keywords: ["smell", "odour", "sweat", "deodorant", "stink"], response: "Sweat itself has no odour! Body odour happens when bacteria on your skin break down your apocrine sweat (which activates during puberty). A daily shower + deodorant or antiperspirant is all you need. It's biology, not embarrassment!" },
        { keywords: ["skincare", "routine", "products", "serum", "toner", "moisturiser"], response: "The evidence-based teenage skincare routine is beautifully simple: gentle cleanser + moisturiser + SPF. That's it! Adult products are often too strong for teenage skin. Save your money and keep it gentle." },
        { keywords: ["pick", "picking", "pop", "popping", "squeeze"], response: "The urge to pick is SO real — but it spreads bacteria, causes deeper inflammation, and can leave permanent marks. The hardest rule is the most important one: hands off! Spot treatment + patience is the actual fix." },
      ],
      defaultResponse: "Gigi hears you! Skin questions are some of the most common for a reason. A trusted adult, doctor, or dermatologist can give you answers tailored exactly to your skin. You're not alone in wondering this!",
      conversationStarterOffer: "Want a gentle way to bring this up with a parent or trusted adult?",
      conversationStarters: [
        "\"Hey [Name], I've been learning about teenage skin and hormones — can we talk about what's a good routine for me?\"",
        "\"I was reading that most skincare products for teens are actually too strong. Could we check what I'm using?\"",
        "\"I noticed some changes with my skin lately and wanted to ask you about it — is that okay?\"",
      ],
    },
  },
  {
    nodeId: "ss_reflection",
    type: "reflection_reward",
    position: "fixed_end",
    title: "Skin Story: Complete",
    xpReward: 30,
    unlocksBadge: "skin_scientist",
    content: {
      moodQuestion: {
        prompt: "Before you go — how do you feel about your skin and body changes now?",
        options: [
          { emoji: "😌", label: "Relieved", gigiResponse: "That relief makes complete sense. Your skin was never the problem — and now you have the real science to prove it." },
          { emoji: "💡", label: "Enlightened", gigiResponse: "Yes! Biology is empowering when you actually understand it. Your skin is doing exactly what it should." },
          { emoji: "💪", label: "Empowered", gigiResponse: "Amara would be proud of you! You've got the science, the mindset, and the Rs.300 routine that actually works." },
        ],
      },
      recapCards: [
        { emoji: "🧬", text: "Sebaceous glands produce more oil during puberty because of androgens — it's biology, not bad hygiene." },
        { emoji: "🔬", text: "A pimple forms when a pore gets blocked, bacteria grow inside, and your immune system reacts." },
        { emoji: "🧴", text: "Evidence-based routine: gentle cleanser + moisturiser + SPF. Skip the Rs.2500 spreadsheet." },
        { emoji: "🚫", text: "Not picking is the hardest — but most important — skin rule of all." },
        { emoji: "💧", text: "Sweat has no odour — bacteria create the smell. Shower + deodorant is all you need." },
        { emoji: "💜", text: "Body hair is personal. Keeping it, removing it, or ignoring it — all valid. Your choice, always." },
      ],
      badge: {
        id: "skin_scientist",
        name: "Skin Scientist",
        emoji: "🧬",
        description: "Awarded for completing Episode 3: Skin Stories and mastering the science of teenage skin!",
        totalPieces: 10,
      },
      closingMessage: {
        character: "Amara",
        text: "This is my face. Doing exactly what it's supposed to do. See you in the next episode — and remember: understanding is where confidence actually begins.",
      },
      nextEpisode: {
        title: "The Period Preview",
        emoji: "🩸",
        teaser: "Everything you need to know before your first period arrives.",
      },
    },
  },
];

async function seed() {
  console.log("🧴 Seeding Episode 3: Skin Stories (ce_skin_stories)...");
  const updated = await prisma.creativeEpisode.update({
    where: { id: "ce_skin_stories" },
    data: {
      title: "3. Skin Stories",
      description: "Oily skin, pimples, glow ups, and simple gentle skincare habits — told through Amara's Rs.2500 mistake and the doctor who set her straight.",
      episodeIcon: "🧴",
      order: 3,
      nodes: SKIN_STORIES_NODES as any,
      totalXP: 205,
      isActive: true,
    },
  });
  console.log(`✅ Episode 3 seeded: "${updated.title}" with ${SKIN_STORIES_NODES.length} nodes & ${updated.totalXP} total XP`);
  console.log("  Nodes seeded:");
  SKIN_STORIES_NODES.forEach((n: any, i: number) => {
    console.log(`  ${i + 1}. [${n.type}] ${n.title} (+${n.xpReward} XP)`);
  });
}

seed()
  .catch((e) => {
    console.error("❌ Episode 3 seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
