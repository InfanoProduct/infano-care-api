import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const journey = await prisma.learningJourney.create({
    data: {
      title: "Understanding Your Cycle",
      description: "A comprehensive guide to understanding your menstrual cycle.",
      ageBand: "13-18",
      thumbnailUrl: "https://example.com/thumbnail1.png",
      totalXP: 100,
      category: "Biology",
      summaries: {
        create: [
          {
            title: "Phase 1: Menstruation",
            description: "What happens during your period.",
            order: 1,
            points: 50,
            content: [
              {
                type: "story_hook",
                title: "The beginning of the cycle",
                content: {
                  text: "Welcome to phase 1!"
                }
              },
              {
                type: "knowledge_check",
                title: "Quick Quiz",
                content: {
                  questions: [
                    {
                      question: "How long does a typical period last?",
                      options: ["1-2 days", "3-7 days", "10-14 days"],
                      correctOptionIndex: 1
                    }
                  ]
                }
              }
            ]
          },
          {
            title: "Phase 2: Follicular",
            description: "The phase after your period.",
            order: 2,
            points: 50,
            content: [
              {
                type: "learning_cards",
                title: "Hormone Changes",
                content: {
                  cards: [
                    { title: "Estrogen", content: "Estrogen levels rise." }
                  ]
                }
              }
            ]
          }
        ]
      }
    }
  });

  console.log("Seeded abstract learning journey: ", journey.title);
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
