import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

const episodeId = '7339cc3c-62b3-4226-85f5-f988aaed1607';

const newQuestions = [
  {
    question: "Which of the following best describes puberty?",
    options: [
      "It starts at the same age for everyone.",
      "It begins only after age 12.",
      "It happens within a wide age range, unique to each person.",
      "It depends only on lifestyle choices"
    ],
    correctIndex: 2,
    optionFeedbacks: [
      "Actually, everyone's body has its own internal clock. Some start earlier, some later.",
      "It can actually start as early as 8 for some people! There's no fixed starting age.",
      "Puberty is a range (8–16), not a fixed timeline.",
      "Lifestyle matters, but genetics and biology are the primary drivers of puberty."
    ]
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
    optionFeedbacks: [
      "12 is actually a very common age for changes! Meera is right on track.",
      "Not necessarily—some people just start a bit later, and that's perfectly normal.",
      "While check-ups are good, this specific scenario is a classic example of healthy variation.",
      "Different timelines = normal variation, not a problem."
    ]
  },
  {
    question: "Which thought pattern is most likely to create unnecessary stress during puberty?",
    options: [
      "“Bodies change at different times”",
      "“I wonder why this is happening”",
      "“Everyone else is normal except me”",
      "“This might be part of growing up”"
    ],
    correctIndex: 2,
    optionFeedbacks: [
      "This is a healthy, realistic thought that usually reduces stress!",
      "Curiosity is great—it shows you are paying attention to your growth.",
      "Isolation thinking increases anxiety—even when things are normal.",
      "Accepting change as part of life can actually help you feel more at ease."
    ]
  },
  {
    question: "Two girls in the same family start puberty 4 years apart. What does this suggest?",
    options: [
      "One of them is unhealthy",
      "Puberty timing is influenced by multiple factors",
      "Only diet determines puberty timing",
      "The older one delayed it intentionally"
    ],
    correctIndex: 1,
    optionFeedbacks: [
      "Actually, healthy bodies can have very different timelines even in the same family!",
      "Genetics, hormones, and body signals all play a role.",
      "Diet is important, but it's just one of many factors like genetics and environment.",
      "Puberty is a biological process we can't intentionally pause or start!"
    ]
  },
  {
    question: "Why is “wondering” considered a healthy response during puberty?",
    options: [
      "It means something is wrong",
      "It shows lack of knowledge",
      "It reflects awareness and attention to change",
      "It delays understanding"
    ],
    correctIndex: 2,
    optionFeedbacks: [
      "Wondering is usually a sign of curiosity, not a sign of a problem.",
      "Not knowing everything is normal! Asking questions is how we learn about our bodies.",
      "Awareness is the first step toward confidence.",
      "In fact, wondering usually speeds up understanding because it leads to asking questions."
    ]
  },
  {
    question: "Which of the following is the most accurate statement?",
    options: [
      "Puberty follows a predictable order for everyone",
      "Physical changes always appear at the same time as emotional changes",
      "The sequence and timing of changes can vary widely between individuals",
      "Early developers always grow taller than others"
    ],
    correctIndex: 2,
    optionFeedbacks: [
      "The order often varies—some people experience one change way before another.",
      "Emotional changes and physical changes often happen at their own separate speeds.",
      "Timing and sequence are both variable.",
      "Actually, height depends more on genetics and long-term nutrition than on when puberty starts."
    ]
  }
];

async function updateQuiz() {
  try {
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId }
    });

    if (!episode) {
      console.log('Episode not found');
      return;
    }

    let content = (episode.content as any) || {};
    if (!content.knowledgeCheck) content.knowledgeCheck = {};
    content.knowledgeCheck.questions = newQuestions;

    await prisma.episode.update({
      where: { id: episodeId },
      data: { content }
    });

    console.log('Successfully updated Episode 1 quiz questions with granular option feedback.');

  } catch (error) {
    console.error('Error updating quiz:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateQuiz();
