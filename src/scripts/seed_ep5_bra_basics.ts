/**
 * Seed script for Episode 5: Bra Basics (ce_bra_basics)
 * Run: npx tsx src/scripts/seed_ep5_bra_basics.ts
 *
 * 10 Nodes:
 *  1. [story]              bb_story_1       — Nobody Told Me (Scenes 1-4)          [fixed_start]
 *  2. [emoji_decoder]      bb_feel_decoder  — Meera's Feelings Decoder
 *  3. [story]              bb_story_2       — The Mall Adventure (Scenes 5-9)
 *  4. [match_pairs]        bb_bra_types     — Bra Type Matcher
 *  5. [myth_busters]       bb_mythbusters   — Bra Myths: Busted!
 *  6. [mystery_task_box]   bb_fit_check     — The Fit Check Lab
 *  7. [quiz]               bb_quiz          — Bra Basics Quiz
 *  8. [timeline_builder]   bb_dev_timeline  — Breast Development Timeline  (NEW)
 *  9. [spot_the_change]    bb_fit_detective — Fit Detective                (NEW)
 * 10. [reflection_reward]  bb_reflection    — Bra Basics: Complete         [fixed_end]
 */
import { prisma } from "../db/client.js";

const BRA_BASICS_NODES: any[] = [
  {
    nodeId: "bb_story_1",
    type: "story",
    position: "fixed_start",
    title: "Nobody Told Me",
    estMinutes: 6,
    xpReward: 20,
    content: {
      pages: [
        {
          pageNumber: 1,
          title: "The Bra on the Bed",
          image: "assets/images/story/page_2.jpg",
          panels: [{
            id: "bb_p1_1",
            description: "The first thing Meera noticed when she came home that afternoon was the bra. It was lying neatly on the middle of her bed. Not hidden inside a cupboard. Not wrapped in a shopping bag. Just there.",
            dialogue: [
              { character: "Narrator", type: "thought", text: "Her schoolbag slipped from her shoulder and landed on the floor." },
              { character: "Meera", type: "thought", text: "Was she supposed to know what this was for?" }
            ]
          }]
        },
        {
          pageNumber: 2,
          title: "The Secret Handbook",
          image: "assets/images/story/page_3.jpg",
          panels: [{
            id: "bb_p1_2",
            description: "Meera picked it up. Turned it around. Looked at the straps. Looked at the cups. Put it down. Picked it up again. Her face slowly changed from confusion to suspicion.",
            dialogue: [
              { character: "Meera", type: "thought", text: "Maybe Mum thought she already knew." },
              { character: "Meera", type: "thought", text: "Maybe all her friends knew." },
              { character: "Meera", type: "thought", text: "Maybe everyone else had received some secret puberty handbook that had somehow missed her." }
            ]
          }]
        },
        {
          pageNumber: 3,
          title: "Gigi Appears",
          image: "assets/images/story/page_4.jpg",
          panels: [{
            id: "bb_p1_3",
            description: "And suddenly, a small thought became a big one. Meera sat on the edge of her bed. She was not scared exactly. She was just unsure. Her phone lit up. Gigi appeared on the screen with a little smile.",
            dialogue: [
              { character: "Meera", type: "thought", text: "Nobody told me anything." },
              { character: "Gigi", type: "speech", text: "Hey Meera. Want to talk about what's going on?" }
            ]
          }]
        },
        {
          pageNumber: 4,
          title: "When Your Body Starts Changing",
          image: "assets/images/story/page_5.jpg",
          panels: [{
            id: "bb_p1_4",
            description: "Gigi helped Meera understand. Puberty doesn't arrive with a calendar notification. It happens gradually. Body hair. Skin changes. And somewhere along the way, breasts begin developing too.",
            dialogue: [
              { character: "Gigi", type: "speech", text: "During puberty, your body produces more hormones — including oestrogen. These help trigger many changes, including breast development. It's completely normal for one breast to develop before the other." },
              { character: "Meera", type: "speech", text: "So this is normal?" },
              { character: "Gigi", type: "speech", text: "Bodies are supposed to be different. There's no perfect size. No perfect timeline. No race to finish puberty before everyone else." }
            ]
          }]
        },
        {
          pageNumber: 5,
          title: "The Bra Is Just an Option",
          image: "assets/images/story/page_6.jpg",
          panels: [{
            id: "bb_p1_5",
            description: "Gigi helped Meera understand something important. Breast development and wearing a bra are two completely different things.",
            dialogue: [
              { character: "Gigi", type: "speech", text: "A bra doesn't cause breasts to grow. It doesn't stop them. It doesn't decide when puberty starts. It's mainly about support, comfort, coverage and personal preference." },
              { character: "Meera", type: "speech", text: "So I don't have to wear it?" },
              { character: "Gigi", type: "speech", text: "You can choose what feels comfortable. And that choice is always yours." }
            ]
          }]
        }
      ]
    }
  },

  {
    nodeId: "bb_feel_decoder",
    type: "emoji_decoder",
    position: "random_pool",
    title: "Meera's Feelings Decoder",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "Meera's Feelings Decoder",
      instruction: "Read each moment from 'Nobody Told Me'. Tap the emoji that best captures how Meera was feeling in that moment!",
      scenarios: [
        {
          id: "bbed1",
          sceneEmoji: "🛏️",
          character: "Meera — The Bra on the Bed",
          scene: "Meera walks into her room. A bra is lying neatly on the middle of her bed. No note. No bag. No explanation. Her mum has disappeared into the kitchen. Her schoolbag slides off her shoulder.",
          options: ["😂", "😴", "😶", "😍"],
          correctEmoji: "😶",
          gigiResponse: "Exactly that stunned, speechless confusion. When something completely unexpected appears in your room with zero explanation, your brain genuinely doesn't know how to react first. Meera's frozen moment was perfectly human.",
          wrongResponse: "Think carefully — something completely unexplained has just appeared in your room. It's not funny or exciting. It's more of a blank, confused standstill. Like your brain buffering."
        },
        {
          id: "bbed2",
          sceneEmoji: "📖",
          character: "Meera — The Secret Handbook Thought",
          scene: "Meera picks up the bra. Puts it down. Picks it up again. Then a thought slowly takes over: maybe all her friends already knew. Maybe everyone received some secret puberty handbook that had somehow missed her.",
          options: ["😡", "😔", "😌", "🤩"],
          correctEmoji: "😔",
          gigiResponse: "That quiet, gentle sadness of feeling left out of something everyone else seems to understand. But here's the truth: Meera was not behind. Nobody had simply explained it to her yet. That is not her fault — and it is not yours either.",
          wrongResponse: "This is a softer, quieter feeling than anger. More like a sad, sinking sense of being left out — of missing something you didn't even know you needed to know."
        },
        {
          id: "bbed3",
          sceneEmoji: "📱",
          character: "Meera — Gigi Appears on the Screen",
          scene: "Meera sits on the edge of her bed, unsure and confused. She wasn't scared exactly — just unsure. Then her phone lights up. Gigi's familiar mascot face appears with a small smile. Meera stares at the screen for a moment — then finally taps it.",
          options: ["😨", "😒", "🤗", "😴"],
          correctEmoji: "🤗",
          gigiResponse: "That small, cautious warmth — the feeling of spotting a friendly face exactly when you needed one. Meera did not know what to expect, but something about Gigi's small smile made her feel like asking was safe.",
          wrongResponse: "Meera has been confused and quietly sad. Now a familiar, friendly face appears. It's not fear or boredom — it's a careful, cautious kind of relief. Like finding a torch in the dark."
        },
        {
          id: "bbed4",
          sceneEmoji: "💡",
          character: "Meera — Learning the Bra Is Just a Choice",
          scene: "Gigi explains: a bra doesn't cause breasts to grow. It doesn't stop them. There is no secret puberty rulebook saying 'bra required.' It's just about comfort, support and personal preference. The choice is always hers.",
          options: ["😰", "😤", "😐", "😌"],
          correctEmoji: "😌",
          gigiResponse: "That exhale of relief when something you thought was complicated turns out to be simpler than it looked. The bra on the bed had felt like a demand. Now it just looked like an option. And that one shift changed everything.",
          wrongResponse: "By this point in the story, Gigi has gently removed the pressure. The bra is no longer a rule — it is a choice. That's not an anxious or angry feeling. It is a soft, quiet kind of relief."
        }
      ]
    }
  },

  {
    nodeId: "bb_story_2",
    type: "story",
    position: "random_pool",
    title: "The Mall Adventure",
    estMinutes: 7,
    xpReward: 20,
    content: {
      pages: [
        {
          pageNumber: 1,
          title: "The Wall of Bras",
          image: "assets/images/story/page_2.jpg",
          panels: [{
            id: "bb_p2_1",
            description: "A few days later, Meera went to the mall with her friend Tara. Then they walked past the lingerie section. Both stopped. Both looked at each other. Then at the enormous wall filled with bras in every colour and design.",
            dialogue: [
              { character: "Meera", type: "speech", text: "Why are there so many??" },
              { character: "Tara", type: "speech", text: "Apparently, bras have a whole personality system." }
            ]
          }]
        },
        {
          pageNumber: 2,
          title: "A Whole Personality System",
          image: "assets/images/story/page_3.jpg",
          panels: [{
            id: "bb_p2_2",
            description: "For the first time, Meera was actually seeing the choices. The everyday bra — comfortable support for regular use. The first bra — lightweight, for someone beginning to explore what feels right as their body develops.",
            dialogue: [
              { character: "Gigi", type: "speech", text: "The name might say 'training,' but a girl's body doesn't need to be trained. There is no official starting age. No deadline. No race." }
            ]
          }]
        },
        {
          pageNumber: 3,
          title: "Sports, Padded, Wire-Free",
          image: "assets/images/story/page_4.jpg",
          panels: [{
            id: "bb_p2_3",
            description: "The sports bra section made immediate sense. For running, jumping, PE class — those moments when your body moves in every direction. Then padded bras — not for growth, just for shape or coverage. And a wire-free soft bra that looked like the perfect lazy Sunday afternoon.",
            dialogue: [
              { character: "Gigi", type: "speech", text: "Padding doesn't make breasts develop. It doesn't make puberty happen faster. It's simply a feature. And comfort matters more than anything else." }
            ]
          }]
        },
        {
          pageNumber: 4,
          title: "The Fit Check",
          image: "assets/images/story/page_5.jpg",
          panels: [{
            id: "bb_p2_4",
            description: "That evening, Gigi introduced Meera to the Fit Check. The band should feel secure, not dig in. The cups should hold comfortably, not overflow. Straps should not fall or dig into shoulders. A bra should support you — it should not hurt you.",
            dialogue: [
              { character: "Gigi", type: "speech", text: "The move test: lift your arms, stretch, bend down, walk. Ask yourself — can I actually live my life comfortably in this? Comfort over trend. Always." }
            ]
          }]
        },
        {
          pageNumber: 5,
          title: "Breaking the Silence Over Chai",
          image: "assets/images/story/page_6.jpg",
          panels: [{
            id: "bb_p2_5",
            description: "A few evenings later, Meera came into the kitchen. The smell of chai filled the room. She finally walked over and sat with her mum. And asked the question she had been carrying for days.",
            dialogue: [
              { character: "Meera", type: "speech", text: "Mum... why did you leave the bra on my bed without saying anything?" },
              { character: "Mum", type: "speech", text: "I hadn't really known how to start. Not because I didn't care. Sometimes adults feel awkward too." },
              { character: "Mum", type: "speech", text: "Questions about your body — bras, periods, everything — are never silly. You can always ask me." }
            ]
          }]
        },
        {
          pageNumber: 6,
          title: "Just Clothing. Just a Choice.",
          image: "assets/images/story/page_2.jpg",
          panels: [{
            id: "bb_p2_6",
            description: "The two of them sat together with their chai. The bra was no longer a mystery. The bigger thing that had changed was the conversation. Growing up was not about suddenly knowing everything. It was about learning. Asking. Laughing. And knowing there was someone she could talk to.",
            dialogue: [
              { character: "Meera", type: "thought", text: "Mum, why are there approximately a million different types of bras?" },
              { character: "Mum", type: "speech", text: "Let's find out together." },
              { character: "Narrator", type: "thought", text: "And somewhere between the awkward question and the laughter that followed, a silence finally ended." }
            ]
          }]
        }
      ]
    }
  },

  {
    nodeId: "bb_bra_types",
    type: "match_pairs",
    position: "random_pool",
    title: "Bra Type Matcher",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "Bra Type Matcher",
      instruction: "Tap a card, then tap its matching card! Match each bra type to what it is designed for.",
      completionMessage: "You matched them all! Now you can walk into that lingerie section without freezing — you know exactly what each one is for!",
      pairs: [
        { id: "bbm1", emoji: "🌸", term: "Everyday Bra", definition: "Lightweight, comfortable support and coverage for daily wear under school or regular clothes" },
        { id: "bbm2", emoji: "🌱", term: "First Bra / Training Bra", definition: "Simple starter style for someone beginning to explore what feels comfortable as their body develops" },
        { id: "bbm3", emoji: "⚡", term: "Sports Bra", definition: "Designed to reduce breast movement during physical activity — running, jumping, PE, dancing" },
        { id: "bbm4", emoji: "✨", term: "Padded Bra", definition: "Has padding for shape or coverage — doesn't affect breast development, just a design feature" },
        { id: "bbm5", emoji: "🌙", term: "Wire-Free Bra", definition: "Soft, comfortable support without underwire — great for all-day wear or sensitive skin" },
        { id: "bbm6", emoji: "💜", term: "Bralette", definition: "Lightweight, unstructured style — stylish and relaxed, no underwire, minimal padding" }
      ]
    }
  },

  {
    nodeId: "bb_mythbusters",
    type: "myth_busters",
    position: "random_pool",
    title: "Bra Myths: Busted!",
    estMinutes: 4,
    xpReward: 20,
    content: {
      instruction: "Swipe RIGHT for TRUE | Swipe LEFT for MYTH",
      cards: [
        { id: "bbmt1", statement: "Wearing a bra makes your breasts grow faster.", verdict: "MYTH", explanation: "Myth! Breast development is driven by hormones and genetics — not by what you wear. A bra has zero effect on how your breasts grow." },
        { id: "bbmt2", statement: "There is no fixed age when every girl must start wearing a bra.", verdict: "TRUE", explanation: "True! Some girls develop earlier, some later. Some choose to wear a bra sooner, some later, some not at all. There is no universal deadline." },
        { id: "bbmt3", statement: "If you don't wear a bra, something bad will happen to your body.", verdict: "MYTH", explanation: "Myth! Not wearing a bra doesn't stop puberty, speed it up, or automatically cause a health problem. It's about comfort and personal preference." },
        { id: "bbmt4", statement: "The tighter the bra, the better the support.", verdict: "MYTH", explanation: "Myth! A bra that's too tight can cause discomfort, rubbing, and irritation. Good support comes from the right design and fit — not squeezing as tightly as possible." },
        { id: "bbmt5", statement: "It's completely normal for both breasts to look slightly different in size.", verdict: "TRUE", explanation: "True! Bodies are not designed using a copy-paste button. Slight differences in breast size or shape are very common, especially during puberty." },
        { id: "bbmt6", statement: "A padded bra can make your breasts develop faster.", verdict: "MYTH", explanation: "Myth! Padding is simply a design feature that can offer shape or coverage based on preference. It doesn't affect development in any way." },
        { id: "bbmt7", statement: "A bra that causes pain or discomfort probably doesn't fit correctly.", verdict: "TRUE", explanation: "True! A well-fitting bra should support you comfortably. If it digs, pinches, or leaves marks — it's a fit issue, not something you should push through." }
      ]
    }
  },

  {
    nodeId: "bb_fit_check",
    type: "mystery_task_box",
    position: "random_pool",
    title: "The Fit Check Lab",
    estMinutes: 4,
    xpReward: 20,
    content: {
      flaps: [
        {
          id: 1,
          type: "fact_task",
          factText: "THE BAND CHECK: The band around your body should feel secure and comfortable. It shouldn't dig painfully into your skin, feel like it's squeezing your ribs, or constantly ride up your back. The band provides about 80% of a bra's support — getting this right matters most!",
          task: {
            question: "Which sign tells you your bra band might be too tight?",
            options: [
              "The band rides up your back when you lift your arms",
              "The band leaves deep, painful marks on your skin",
              "The band feels slightly snug but comfortable",
              "The band stays flat against your back"
            ],
            correctIndex: 1,
            feedbackText: "Deep marks mean the band is pressing too hard. You should be able to slide two fingers under a well-fitting band comfortably — firm but never painful!"
          }
        },
        {
          id: 2,
          type: "mini_task",
          prompt: "Gigi's Fit Check! Which of these are fit problems? Select all that apply.",
          options: [
            { label: "Straps constantly falling off shoulders", emoji: "🎗️" },
            { label: "Cups wrinkle or gap at the front", emoji: "👕" },
            { label: "Bra feels comfortable during the move test", emoji: "✅" },
            { label: "Underwire digs painfully into breast tissue", emoji: "⚡" },
            { label: "The band rides up your back", emoji: "🔼" }
          ],
          correctIndices: [0, 1, 3, 4],
          feedbackText: "All four are classic fit problems! Falling straps, gaping cups, painful underwire, and a riding band all signal something needs adjusting. Only option 3 is the sign of a good fit."
        },
        {
          id: 3,
          type: "fact_reflection",
          factText: "THE MOVE TEST: When trying on a new bra, lift your arms above your head, stretch side to side, bend forward, then walk around. The goal isn't to look perfect in the mirror. The goal is: 'Can I actually live my life comfortably in this?' COMFORT > TREND. Always.",
          reflectionPrompt: "After learning about the fit check, how do you feel about choosing a bra for yourself one day?",
          emojiOptions: ["😌 More confident", "🤔 Still curious", "💪 Ready to try!"],
          isPrivate: true,
          feedbackText: "Knowing what to look for makes everything less overwhelming. The fitting room is just a conversation between you and what feels right."
        },
        {
          id: 4,
          type: "sticker_reward",
          message: "You completed The Fit Check Lab! Gigi says: you are now officially a Fit Check Expert! Here's your sticker!",
          stickerEmoji: "🏷️✨"
        }
      ]
    }
  },

  {
    nodeId: "bb_quiz",
    type: "quiz",
    position: "random_pool",
    title: "Bra Basics Quiz",
    estMinutes: 5,
    xpReward: 25,
    passThreshold: 0.6,
    content: {
      questions: [
        {
          id: "bbq1",
          text: "What primarily triggers breast development during puberty?",
          options: ["Wearing a bra early", "Hormones like oestrogen", "Eating certain foods", "Comparing yourself to friends"],
          correctIndex: 1,
          feedback: "Oestrogen and other hormones produced during puberty trigger breast development. It has nothing to do with bras, food, or what anyone else is doing!"
        },
        {
          id: "bbq2",
          text: "Meera found a bra on her bed with no explanation. What did Gigi help her understand?",
          options: [
            "She was now old enough to wear one every day",
            "Wearing a bra is compulsory once puberty starts",
            "A bra is a personal choice about comfort — not a puberty rule",
            "All girls should wear a bra at exactly the same age"
          ],
          correctIndex: 2,
          feedback: "A bra is a clothing choice — not a puberty requirement. There is no secret puberty rulebook saying 'You have reached this age. Bra required.'"
        },
        {
          id: "bbq3",
          text: "Which type of bra is specifically designed to provide support during physical activity like running or PE?",
          options: ["Padded Bra", "Wire-Free Bra", "Sports Bra", "Bralette"],
          correctIndex: 2,
          feedback: "The sports bra is designed to reduce breast movement during activity. Think of it like any other piece of sportswear — like shoes or shorts."
        },
        {
          id: "bbq4",
          text: "Meera noticed one breast looked slightly different from the other. Gigi's response was:",
          options: [
            "That means you need to see a doctor immediately",
            "It's common for breasts to be slightly asymmetrical — bodies aren't copy-paste",
            "Try a different food to fix it",
            "You should only wear one-sided bras"
          ],
          correctIndex: 1,
          feedback: "Asymmetry is very common, especially during puberty when breast tissue is actively developing. Bodies vary — and that variation is completely normal."
        },
        {
          id: "bbq5",
          text: "Which is the best sign that a bra fits correctly?",
          options: [
            "The band leaves a slight mark when you take it off",
            "The straps dig into your shoulders slightly",
            "You can comfortably lift your arms, walk, and bend without the bra shifting",
            "The cups have a little empty space at the top"
          ],
          correctIndex: 2,
          feedback: "The move test! A well-fitting bra stays in place during movement, doesn't dig or pinch, and lets you actually live your life in it."
        },
        {
          id: "bbq6",
          text: "At the end of the story, why had Meera's mum not explained the bra before leaving it on the bed?",
          options: [
            "She thought Meera already knew everything",
            "She didn't care about explaining it",
            "She felt awkward and didn't know how to start the conversation",
            "She wanted Meera to figure it out alone"
          ],
          correctIndex: 2,
          feedback: "Adults feel awkward too! Sometimes silence around puberty is not because it's wrong to talk about — it's because no one explained it to them either. The conversation just needed one brave first question."
        }
      ]
    }
  },

  {
    nodeId: "bb_dev_timeline",
    type: "timeline_builder",
    position: "random_pool",
    title: "Breast Development Timeline",
    estMinutes: 4,
    xpReward: 20,
    content: {
      instruction: "Here are key steps of breast development during puberty. Drag the cards and arrange them in the order you think they happen — from earliest to latest!",
      cards: [
        {
          id: "bbdt1",
          emoji: "🌱",
          label: "Before Puberty",
          description: "No visible breast development yet. The nipple is slightly raised. This is where everyone starts — it's not a sign that anything is delayed.",
          order: 1
        },
        {
          id: "bbdt2",
          emoji: "🫧",
          label: "Breast Buds Appear",
          description: "A small mound (called a breast bud) begins forming under the nipple. The areola (darker area around the nipple) gets slightly wider. This can feel tender — completely normal!",
          order: 2
        },
        {
          id: "bbdt3",
          emoji: "🌸",
          label: "Continued Growth",
          description: "Breast tissue continues to develop and becomes more rounded. One side may develop before the other — also very normal.",
          order: 3
        },
        {
          id: "bbdt4",
          emoji: "🌺",
          label: "Further Development",
          description: "Breasts become more defined. The nipple and areola may form a separate mound above the breast tissue. Not everyone goes through this exact phase — all variations are normal.",
          order: 4
        },
        {
          id: "bbdt5",
          emoji: "💐",
          label: "Adult Shape",
          description: "Breasts reach their adult shape and size — which varies enormously between people. There's no correct size or shape. Development is complete, but breasts can still change throughout life.",
          order: 5
        }
      ],
      revealMessage: "Well done! Breast development is a gradual process — not an overnight change. One girl might move through this timeline quickly; another slowly. Some steps may even overlap. The most important thing: wherever you are on this timeline is exactly right for you."
    }
  },


  {
    nodeId: "bb_comfort_sorter",
    type: "drag_to_sort",
    position: "random_pool",
    title: "Good Fit or Fit Problem?",
    estMinutes: 4,
    xpReward: 20,
    content: {
      title: "Good Fit or Fit Problem?",
      instruction: "Drag each bra situation into the correct bin — is it a sign of a GOOD FIT, or a FIT PROBLEM that needs fixing?",
      bins: [
        { id: "bin_good", label: "Good Fit ✅", emoji: "✅", colorHex: "10B981" },
        { id: "bin_bad",  label: "Fit Problem ❌", emoji: "❌", colorHex: "EF4444" }
      ],
      items: [
        {
          id: "cs1",
          emoji: "🎗️",
          text: "Band sits flat and snug across your back",
          correctBinId: "bin_good",
          learningNote: "A flat, secure band is the foundation of a good-fitting bra — it provides around 80% of the support."
        },
        {
          id: "cs2",
          emoji: "🔼",
          text: "Band rides up towards your shoulders when you lift your arms",
          correctBinId: "bin_bad",
          learningNote: "A riding band usually means it's too large. Try going down a band size for a firmer, flatter fit."
        },
        {
          id: "cs3",
          emoji: "💨",
          text: "You can comfortably lift your arms without the bra shifting at all",
          correctBinId: "bin_good",
          learningNote: "Staying put during the move test is the gold standard! A bra should support your life, not hold you back."
        },
        {
          id: "cs4",
          emoji: "⚡",
          text: "Underwire digs painfully into breast tissue",
          correctBinId: "bin_bad",
          learningNote: "Underwire should sit in the crease below and around the breast, not press into it. Try a larger cup size."
        },
        {
          id: "cs5",
          emoji: "🫧",
          text: "Cups sit smoothly with no wrinkling or gaping",
          correctBinId: "bin_good",
          learningNote: "Smooth, wrinkle-free cups that follow the natural shape mean the cup size is just right."
        },
        {
          id: "cs6",
          emoji: "😣",
          text: "Straps leave deep red marks on your shoulders after wearing",
          correctBinId: "bin_bad",
          learningNote: "Deep strap marks mean the straps are doing too much work — usually a sign the band is too large."
        },
        {
          id: "cs7",
          emoji: "💫",
          text: "Breast tissue sits fully inside the cup without spilling over",
          correctBinId: "bin_good",
          learningNote: "Full coverage inside the cup with no overflow means you've found the right cup size. Perfect!"
        },
        {
          id: "cs8",
          emoji: "🌊",
          text: "Breast tissue spills over the top or sides of the cup",
          correctBinId: "bin_bad",
          learningNote: "Spillage means the cup is likely too small. All breast tissue should sit comfortably inside — not overflow."
        }
      ],
      completionMessage: "You sorted every single one correctly! You now know exactly what separates a bra that works for you from one that needs changing. Comfort is never something to push through — it's something you deserve."
    }
  },


  {
    nodeId: "bb_reflection",
    type: "reflection_reward",
    position: "fixed_end",
    title: "Bra Basics: Complete",
    xpReward: 30,
    unlocksBadge: "bra_basics_graduate",
    content: {
      moodQuestion: {
        prompt: "Before you go — how do you feel about bras and your changing body now?",
        options: [
          {
            emoji: "😌",
            label: "Relieved",
            gigiResponse: "That relief is completely earned. Meera felt it too — the moment someone explained it without making it a big deal. The confusion has somewhere to go now. You have the knowledge."
          },
          {
            emoji: "💪",
            label: "Confident",
            gigiResponse: "Yes! Understanding your own body is one of the most empowering things you can do. From bra wall overwhelm to fit detective — you have come a long way in one episode!"
          },
          {
            emoji: "🤔",
            label: "Still curious",
            gigiResponse: "Curiosity is how understanding grows. Every question is worth asking. There's a trusted adult in your life who'd love to talk — and Gigi is always here too."
          },
          {
            emoji: "💛",
            label: "Grateful for Meera's story",
            gigiResponse: "Meera's story is for every girl who found something on her bed with no note attached. For every silent question. For every conversation that was waiting to happen. Carry that warmth with you."
          }
        ]
      },
      recapCards: [
        { emoji: "🌸", text: "Breast development is triggered by hormones during puberty — not by what you wear, eat, or do." },
        { emoji: "👚", text: "Wearing a bra is a personal choice about comfort, support and coverage — not a puberty requirement." },
        { emoji: "⚡", text: "Different bras for different needs: sports bra for activity, wire-free for comfort, everyday for support." },
        { emoji: "🏷️", text: "A good fit means no digging, no riding up, no spillage, and passing the move test with ease." },
        { emoji: "💜", text: "Breast asymmetry is very common during puberty. Bodies are not designed using copy-paste." },
        { emoji: "☕", text: "The silence isn't because it's wrong to talk about. Sometimes it's just waiting for one brave question to break it." }
      ],
      badge: {
        id: "bra_basics_graduate",
        name: "Bra Basics Graduate",
        emoji: "👚",
        description: "Awarded for completing Episode 5: Bra Basics — understanding bras, breast development, and comfort with confidence!",
        totalPieces: 10
      },
      closingMessage: {
        character: "Meera",
        text: "If I could go back to that moment — standing at the doorway, staring at the bra on my bed — I'd still feel confused. But I'd also know: I can ask. I can choose. And what's happening to my body isn't something to be ashamed of. I hope you know that too."
      },
      nextEpisode: {
        title: "Body Image Unlocked",
        emoji: "🪞",
        teaser: "Loving your unique shape and busting social media comparison traps."
      }
    }
  }
];

async function seed() {
  console.log("👚 Seeding Episode 5: Bra Basics (ce_bra_basics)...");
  const updated = await prisma.creativeEpisode.update({
    where: { id: "ce_bra_basics" },
    data: {
      title: "5. Bra Basics",
      description: "From finding a mysterious bra on her bed to navigating the mall wall of options — Meera's story of understanding breast development, bra types, fit, and having the conversation she'd been waiting for.",
      episodeIcon: "👚",
      order: 5,
      nodes: BRA_BASICS_NODES as any,
      totalXP: 215,
      isActive: true
    }
  });
  console.log(`✅ Episode 5 seeded: "${updated.title}" with ${BRA_BASICS_NODES.length} nodes & ${updated.totalXP} total XP`);
  console.log("  Nodes seeded:");
  BRA_BASICS_NODES.forEach((n: any, i: number) => {
    console.log(`  ${i + 1}. [${n.type}] ${n.title} (+${n.xpReward} XP)`);
  });
}

seed()
  .catch((e) => {
    console.error("❌ Episode 5 seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
